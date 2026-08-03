import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, isNull, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import { verifyToken } from '@clerk/backend'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { CreateCommentSchema } from '@fts/types'
import { db } from '../db'
import { comments, users, spots } from '../db/schema'
import { requireAuth, getAuth } from '../middleware/auth'
import { sha256Hex } from '../services/verification'
import { anonNameFromHash } from '../services/anon-name'

type AuthEnv = {
  Variables: {
    userId: string
  }
}

// Anon comment rate limiter: max 3 per hour per IP
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const anonCommentLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '60 m'),
  analytics: true,
  prefix: 'fts:anon-comment',
})

export const commentsRouter = new Hono<AuthEnv>()

// GET /:spotId/comments — public, nested replies
commentsRouter.get('/:spotId/comments', async (c) => {
  const spotId = c.req.param('spotId')

  const spot = await db.query.spots.findFirst({ where: eq(spots.id, spotId) })
  if (!spot) {
    return c.json({ error: 'Spot not found' }, 404)
  }

  // Fetch top-level comments
  const topLevel = await db.query.comments.findMany({
    where: and(eq(comments.spotId, spotId), isNull(comments.parentId)),
    orderBy: (comments, { desc }) => [desc(comments.createdAt)],
    limit: 50,
  })

  // Collect unique non-anonymous user IDs from top-level
  const topLevelUserIds = topLevel
    .filter((c) => !c.isAnonymous && c.userId !== null)
    .map((c) => c.userId as string)

  // Fetch replies for all top-level comments
  const allReplies =
    topLevel.length > 0
      ? await db.query.comments.findMany({
          where: (comments, { inArray, eq: eqFn, and: andFn }) =>
            andFn(
              eqFn(comments.spotId, spotId),
              inArray(
                comments.parentId,
                topLevel.map((t) => t.id),
              ),
            ),
          orderBy: (comments, { asc }) => [asc(comments.createdAt)],
        })
      : []

  const replyUserIds = allReplies
    .filter((r) => !r.isAnonymous && r.userId !== null)
    .map((r) => r.userId as string)

  const allUserIds = [...new Set([...topLevelUserIds, ...replyUserIds])]

  // Batch-fetch user data for all involved users
  const userMap = new Map<string, { displayName: string | null; avatarUrl: string | null; username: string }>()
  if (allUserIds.length > 0) {
    const userRows = await db.query.users.findMany({
      where: (users, { inArray }) => inArray(users.id, allUserIds),
      columns: { id: true, displayName: true, avatarUrl: true, username: true },
    })
    for (const u of userRows) {
      userMap.set(u.id, { displayName: u.displayName, avatarUrl: u.avatarUrl, username: u.username })
    }
  }

  function formatComment(
    comment: (typeof topLevel)[number],
  ): Record<string, unknown> {
    const isAnon = comment.isAnonymous

    let displayName: string
    let avatarIndex: number

    if (isAnon && comment.anonEmailHash) {
      const derived = anonNameFromHash(comment.anonEmailHash)
      displayName = derived.displayName
      avatarIndex = derived.avatarIndex
    } else if (isAnon && comment.userId) {
      // Signed-in user posting anonymously — derive from userId hash
      const derived = anonNameFromHash(comment.userId.replace(/-/g, '').padEnd(64, '0'))
      displayName = derived.displayName
      avatarIndex = derived.avatarIndex
    } else {
      const author = comment.userId ? userMap.get(comment.userId) : undefined
      displayName = author
        ? (author.displayName ?? author.username)
        : 'Anonymous'
      avatarIndex = -1 // -1 = show real avatar photo
    }

    const author = !isAnon && comment.userId ? userMap.get(comment.userId) : undefined

    return {
      id: comment.id,
      spotId: comment.spotId,
      userId: isAnon ? null : comment.userId,
      parentId: comment.parentId,
      body: comment.body,
      isAnonymous: comment.isAnonymous,
      helpfulCount: comment.helpfulCount,
      createdAt: comment.createdAt,
      displayName,
      avatarIndex,
      avatarUrl: author?.avatarUrl ?? null,
    }
  }

  // Group replies by parentId
  const repliesByParent = new Map<string, (typeof allReplies)[number][]>()
  for (const reply of allReplies) {
    if (!reply.parentId) continue
    const bucket = repliesByParent.get(reply.parentId) ?? []
    bucket.push(reply)
    repliesByParent.set(reply.parentId, bucket)
  }

  const result = topLevel.map((comment) => ({
    ...formatComment(comment),
    replies: (repliesByParent.get(comment.id) ?? []).map(formatComment),
  }))

  return c.json({ comments: result })
})

// POST /:spotId/comments — create comment (auth optional, supports anonymous)
commentsRouter.post('/:spotId/comments', async (c) => {
  const spotId = c.req.param('spotId')

  const spot = await db.query.spots.findFirst({ where: eq(spots.id, spotId) })
  if (!spot) {
    return c.json({ error: 'Spot not found' }, 404)
  }

  let body: z.infer<typeof CreateCommentSchema>
  try {
    const raw = await c.req.json()
    const parsed = CreateCommentSchema.safeParse(raw)
    if (!parsed.success) {
      return c.json({ error: 'Validation error', issues: parsed.error.issues }, 422)
    }
    body = parsed.data
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const authHeader = c.req.header('Authorization')
  let dbUserId: string | null = null
  let displayName: string
  let avatarIndex: number
  let anonEmailHash: string | null = null
  let authorAvatarUrl: string | null = null

  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Authenticated path
    const token = authHeader.slice(7)
    let clerkId: string
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      })
      clerkId = payload.sub
    } catch {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    dbUserId = user.id

    if (body.isAnonymous) {
      const derived = anonNameFromHash(user.id.replace(/-/g, '').padEnd(64, '0'))
      displayName = derived.displayName
      avatarIndex = derived.avatarIndex
      authorAvatarUrl = null
    } else {
      displayName = user.displayName ?? user.username
      avatarIndex = -1
      authorAvatarUrl = user.avatarUrl ?? null
    }
  } else {
    // Unauthenticated anonymous path
    if (!body.isAnonymous) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    if (!body.anonEmail) {
      return c.json({ error: 'anonEmail is required for anonymous comments' }, 422)
    }

    // Rate limit by IP
    const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? 'unknown'
    const { success } = await anonCommentLimiter.limit(ip)
    if (!success) {
      return c.json({ error: 'Too many anonymous comments. Try again later.' }, 429)
    }

    anonEmailHash = await sha256Hex(body.anonEmail)
    const derived = anonNameFromHash(anonEmailHash)
    displayName = derived.displayName
    avatarIndex = derived.avatarIndex
  }

  // Validate parentId exists and belongs to this spot
  if (body.parentId) {
    const parent = await db.query.comments.findFirst({
      where: and(eq(comments.id, body.parentId), eq(comments.spotId, spotId)),
    })
    if (!parent) {
      return c.json({ error: 'Parent comment not found' }, 404)
    }
  }

  const [created] = await db
    .insert(comments)
    .values({
      spotId,
      userId: dbUserId,
      parentId: body.parentId ?? null,
      body: body.body,
      isAnonymous: body.isAnonymous,
      anonEmailHash,
    })
    .returning()

  if (!created) {
    return c.json({ error: 'Failed to create comment' }, 500)
  }

  return c.json(
    {
      id: created.id,
      spotId: created.spotId,
      userId: body.isAnonymous ? null : dbUserId,
      parentId: created.parentId,
      body: created.body,
      isAnonymous: created.isAnonymous,
      helpfulCount: created.helpfulCount,
      createdAt: created.createdAt,
      displayName,
      avatarIndex,
      avatarUrl: authorAvatarUrl,
    },
    201,
  )
})

// POST /:spotId/comments/:commentId/vote — helpful / not helpful vote
const VoteSchema = z.object({
  vote: z.union([z.literal(1), z.literal(-1)]),
})

commentsRouter.post(
  '/:spotId/comments/:commentId/vote',
  requireAuth,
  zValidator('json', VoteSchema),
  async (c) => {
    const commentId = c.req.param('commentId')
    const spotId = c.req.param('spotId')
    const { vote } = c.req.valid('json')

    const comment = await db.query.comments.findFirst({
      where: and(eq(comments.id, commentId), eq(comments.spotId, spotId)),
    })

    if (!comment) {
      return c.json({ error: 'Comment not found' }, 404)
    }

    // Adjust helpfulCount: +1 for helpful, -1 for not helpful (floor at 0)
    const delta = vote === 1 ? 1 : -1

    const [updated] = await db
      .update(comments)
      .set({
        helpfulCount: sql<number>`GREATEST(0, ${comments.helpfulCount} + ${delta})`,
      })
      .where(eq(comments.id, commentId))
      .returning()

    if (!updated) {
      return c.json({ error: 'Failed to update vote' }, 500)
    }

    return c.json({
      id: updated.id,
      spotId: updated.spotId,
      helpfulCount: updated.helpfulCount,
    })
  },
)

// DELETE /:spotId/comments/:commentId — soft delete (author only)
commentsRouter.delete('/:spotId/comments/:commentId', requireAuth, async (c) => {
  const clerkId = getAuth(c)
  const commentId = c.req.param('commentId')
  const spotId = c.req.param('spotId')

  const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  const comment = await db.query.comments.findFirst({
    where: and(eq(comments.id, commentId), eq(comments.spotId, spotId)),
  })

  if (!comment) {
    return c.json({ error: 'Comment not found' }, 404)
  }

  if (comment.userId !== user.id) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  // Soft delete — replace body, keep record for thread integrity
  const [updated] = await db
    .update(comments)
    .set({ body: '[deleted]' })
    .where(eq(comments.id, commentId))
    .returning()

  return c.json({ success: true, comment: updated })
})
