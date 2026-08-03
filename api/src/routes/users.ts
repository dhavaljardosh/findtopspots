import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users, spots, reviews } from '../db/schema'
import { requireAuth, getAuth } from '../middleware/auth'

type AuthEnv = {
  Variables: {
    userId: string
  }
}

export const usersRouter = new Hono<AuthEnv>()

// GET /me — current authenticated user
usersRouter.get('/me', requireAuth, async (c) => {
  const clerkId = getAuth(c)

  const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json(user)
})

// GET /:id — public user profile
usersRouter.get('/:id', async (c) => {
  const id = c.req.param('id')

  const user = await db.query.users.findFirst({ where: eq(users.id, id) })
  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  // Strip sensitive fields for public view — clerkId is internal
  const { clerkId: _, ...publicProfile } = user

  return c.json(publicProfile)
})

// GET /:id/spots — spots created by user
usersRouter.get('/:id/spots', async (c) => {
  const id = c.req.param('id')
  const limitParam = c.req.query('limit')
  const limit = Math.min(Number(limitParam ?? 20), 100)

  const userSpots = await db.query.spots.findMany({
    where: eq(spots.createdBy, id),
    limit,
    orderBy: (spots, { desc }) => [desc(spots.createdAt)],
  })

  return c.json({ spots: userSpots })
})

// GET /:id/reviews — reviews written by user
usersRouter.get('/:id/reviews', async (c) => {
  const id = c.req.param('id')
  const limitParam = c.req.query('limit')
  const limit = Math.min(Number(limitParam ?? 20), 100)

  const userReviews = await db.query.reviews.findMany({
    where: eq(reviews.userId, id),
    limit,
    orderBy: (reviews, { desc }) => [desc(reviews.createdAt)],
  })

  return c.json({ reviews: userReviews })
})
