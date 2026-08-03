import { Hono } from 'hono'
import { eq, desc, sql } from 'drizzle-orm'
import { db } from '../db'
import { spots, users, businessClaims } from '../db/schema'
import { requireAuth, getAuth } from '../middleware/auth'
import { getOrSyncUser } from './users'

type AuthEnv = { Variables: { userId: string } }
export const adminRouter = new Hono<AuthEnv>()

// Admin-only middleware
const requireAdmin = async (c: any, next: any) => {
  const clerkId = getAuth(c)
  const user = await getOrSyncUser(clerkId)
  if (!user?.isAdmin) return c.json({ error: 'Forbidden' }, 403)
  return next()
}

// GET /admin/spots — spots queue filtered by status
adminRouter.get('/spots', requireAuth, requireAdmin, async (c) => {
  const status = c.req.query('status') ?? 'pending'
  const rows = await db.query.spots.findMany({
    where: eq(spots.status, status),
    orderBy: [desc(spots.createdAt)],
    limit: 50,
  })
  return c.json({ spots: rows })
})

// PATCH /admin/spots/:id — approve or reject
adminRouter.patch('/spots/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id')
  const { status } = await c.req.json<{ status: string }>()
  if (!['live', 'rejected', 'pending'].includes(status)) {
    return c.json({ error: 'Invalid status' }, 400)
  }
  const [updated] = await db.update(spots).set({ status }).where(eq(spots.id, id)).returning()
  return c.json(updated)
})

// GET /admin/claims — pending business claims
adminRouter.get('/claims', requireAuth, requireAdmin, async (c) => {
  const rows = await db.query.businessClaims.findMany({
    where: eq(businessClaims.status, 'pending'),
    orderBy: [desc(businessClaims.createdAt)],
    limit: 50,
  })
  return c.json({ claims: rows })
})

// PATCH /admin/claims/:id — approve or reject
adminRouter.patch('/claims/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id')
  const { status } = await c.req.json<{ status: string }>()
  const validStatuses = ['basic', 'verified', 'rejected'] as const
  type ClaimStatus = typeof validStatuses[number]
  if (!validStatuses.includes(status as ClaimStatus)) {
    return c.json({ error: 'Invalid status' }, 400)
  }
  const claimStatus = status as ClaimStatus
  const [updated] = await db.update(businessClaims).set({ status: claimStatus }).where(eq(businessClaims.id, id)).returning()
  // If approved, mark spot as verified business
  if (updated && (claimStatus === 'basic' || claimStatus === 'verified')) {
    await db.update(spots).set({ isVerifiedBusiness: true }).where(eq(spots.id, updated.spotId))
  }
  return c.json(updated)
})

// GET /admin/stats
adminRouter.get('/stats', requireAuth, requireAdmin, async (c) => {
  const [totalSpots, totalUsers, pendingClaims] = await Promise.all([
    db.select().from(spots),
    db.select().from(users),
    db.select().from(businessClaims).where(eq(businessClaims.status, 'pending')),
  ])
  return c.json({
    totalSpots: totalSpots.length,
    totalUsers: totalUsers.length,
    pendingClaims: pendingClaims.length,
  })
})

// GET /admin/analytics — site-wide daily stats
adminRouter.get('/analytics', requireAuth, requireAdmin, async (c) => {
  const days = Math.min(Number(c.req.query('days') ?? 30), 90)

  const [dailyViews, topSpots, totalStats] = await Promise.all([
    // Daily unique visitors + total views for last N days
    db.execute(sql`
      SELECT
        viewed_date::text AS date,
        COUNT(*) AS total_views,
        COUNT(DISTINCT session_id) AS unique_visitors
      FROM spot_views
      WHERE viewed_date >= CURRENT_DATE - INTERVAL '${sql.raw(String(days))} days'
      GROUP BY viewed_date
      ORDER BY viewed_date DESC
    `),

    // Top spots by unique visitors (last 30 days)
    db.execute(sql`
      SELECT
        sv.spot_id,
        s.name,
        s.category,
        COUNT(DISTINCT sv.session_id) AS unique_visitors,
        s.vote_count,
        s.avg_rating
      FROM spot_views sv
      JOIN spots s ON s.id = sv.spot_id
      WHERE sv.viewed_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY sv.spot_id, s.name, s.category, s.vote_count, s.avg_rating
      ORDER BY unique_visitors DESC
      LIMIT 10
    `),

    // Overall totals
    db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM spot_views WHERE viewed_date = CURRENT_DATE) AS views_today,
        (SELECT COUNT(DISTINCT session_id) FROM spot_views WHERE viewed_date = CURRENT_DATE) AS unique_today,
        (SELECT COUNT(DISTINCT session_id) FROM spot_views WHERE viewed_date >= CURRENT_DATE - 7) AS unique_7d,
        (SELECT COUNT(DISTINCT session_id) FROM spot_views WHERE viewed_date >= CURRENT_DATE - 30) AS unique_30d
    `),
  ])

  return c.json({
    daily: dailyViews.rows,
    topSpots: topSpots.rows,
    totals: totalStats.rows[0] ?? {},
  })
})

// POST /admin/make-admin — make a user admin by clerkId (requires existing admin)
adminRouter.post('/make-admin', requireAuth, requireAdmin, async (c) => {
  const { clerkId } = await c.req.json<{ clerkId: string }>()
  const [updated] = await db.update(users).set({ isAdmin: true }).where(eq(users.clerkId, clerkId)).returning()
  if (!updated) return c.json({ error: 'User not found' }, 404)
  return c.json({ ok: true, userId: updated.id })
})

// POST /admin/bootstrap — first-time admin setup (only works when zero admins exist)
adminRouter.post('/bootstrap', async (c) => {
  const { secret } = await c.req.json<{ secret: string }>()
  if (secret !== process.env.ADMIN_BOOTSTRAP_SECRET) {
    return c.json({ error: 'Invalid secret' }, 403)
  }
  // Only allow if no admins exist yet
  const existingAdmins = await db.query.users.findMany({
    where: eq(users.isAdmin, true),
    limit: 1,
  })
  if (existingAdmins.length > 0) {
    return c.json({ error: 'Admin already exists. Use /make-admin instead.' }, 409)
  }
  // Make the first user (or by email if provided) admin
  const { clerkId } = await c.req.json<{ clerkId?: string; secret: string }>().catch(() => ({ clerkId: undefined, secret: '' }))
  const targetUser = clerkId
    ? await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
    : await db.query.users.findFirst({ orderBy: [desc(users.createdAt)] })
  if (!targetUser) return c.json({ error: 'No users found' }, 404)
  const [updated] = await db.update(users).set({ isAdmin: true }).where(eq(users.id, targetUser.id)).returning()
  return c.json({ ok: true, userId: updated?.id, username: updated?.username })
})
