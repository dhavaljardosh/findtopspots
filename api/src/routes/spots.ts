import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, ilike, or, lt, desc, type SQL } from 'drizzle-orm'
import { CreateSpotSchema, UpdateSpotSchema, SpotQuerySchema } from '@fts/types'
import { db } from '../db'
import { spots, users, spotTags, spotPhotos } from '../db/schema'
import { requireAuth, getAuth } from '../middleware/auth'

type AuthEnv = {
  Variables: {
    userId: string
  }
}

export const spotsRouter = new Hono<AuthEnv>()

// GET / — browse spots
spotsRouter.get('/', zValidator('query', SpotQuerySchema), async (c) => {
  const { q, category, limit, cursor } = c.req.valid('query')

  // TODO: implement haversine distance filtering when lat/lng/radiusKm are provided
  const conditions: SQL[] = []

  if (q) {
    conditions.push(or(ilike(spots.name, `%${q}%`), ilike(spots.description, `%${q}%`))!)
  }

  if (category) {
    conditions.push(eq(spots.category, category))
  }

  if (cursor) {
    conditions.push(lt(spots.createdAt, new Date(cursor)))
  }

  const rows = await db.query.spots.findMany({
    where: conditions.length > 0 ? (_, { and }) => and(...conditions) : undefined,
    orderBy: [desc(spots.createdAt)],
    limit: limit + 1,
  })

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? items.at(-1)?.createdAt?.toISOString() : undefined

  return c.json({ spots: items, nextCursor })
})

// POST / — create spot
spotsRouter.post('/', requireAuth, zValidator('json', CreateSpotSchema), async (c) => {
  const clerkId = getAuth(c)
  const body = c.req.valid('json')

  // Look up the DB user by Clerk ID
  const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  const { tags, ...spotData } = body

  const [created] = await db
    .insert(spots)
    .values({ ...spotData, createdBy: user.id })
    .returning()

  if (!created) return c.json({ error: 'Failed to create spot' }, 500)

  if (tags && tags.length > 0) {
    await db.insert(spotTags).values(tags.map((tag) => ({ spotId: created.id, tag })))
  }

  return c.json(created, 201)
})

// GET /:id — fetch spot by id
spotsRouter.get('/:id', async (c) => {
  const id = c.req.param('id')

  const spot = await db.query.spots.findFirst({
    where: eq(spots.id, id),
    with: {
      // TODO: drizzle relations must be defined on schema for `with` to work;
      // for now fetch tags and photos separately
    },
  })

  if (!spot) {
    return c.json({ error: 'Spot not found' }, 404)
  }

  const [tags, photos] = await Promise.all([
    db.select().from(spotTags).where(eq(spotTags.spotId, id)),
    db.select().from(spotPhotos).where(eq(spotPhotos.spotId, id)),
  ])

  return c.json({ ...spot, tags: tags.map((t) => t.tag), photos })
})

// PUT /:id — update spot
spotsRouter.put('/:id', requireAuth, zValidator('json', UpdateSpotSchema), async (c) => {
  const clerkId = getAuth(c)
  const id = c.req.param('id')
  const body = c.req.valid('json')

  const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  const spot = await db.query.spots.findFirst({ where: eq(spots.id, id) })
  if (!spot) {
    return c.json({ error: 'Spot not found' }, 404)
  }

  if (spot.createdBy !== user.id) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const { tags, ...spotData } = body

  const [updated] = await db.update(spots).set(spotData).where(eq(spots.id, id)).returning()

  // Replace tags if provided
  if (tags !== undefined) {
    await db.delete(spotTags).where(eq(spotTags.spotId, id))
    if (tags.length > 0) {
      await db.insert(spotTags).values(tags.map((tag) => ({ spotId: id, tag })))
    }
  }

  return c.json(updated)
})

// DELETE /:id — delete spot
spotsRouter.delete('/:id', requireAuth, async (c) => {
  const clerkId = getAuth(c)
  const id = c.req.param('id')

  const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  const spot = await db.query.spots.findFirst({ where: eq(spots.id, id) })
  if (!spot) {
    return c.json({ error: 'Spot not found' }, 404)
  }

  if (spot.createdBy !== user.id) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  await db.delete(spots).where(eq(spots.id, id))

  return c.json({ success: true })
})
