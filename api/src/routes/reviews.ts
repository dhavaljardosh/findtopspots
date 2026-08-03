import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, avg, count } from 'drizzle-orm'
import { CreateReviewSchema } from '@fts/types'
import { db } from '../db'
import { reviews, spots, users } from '../db/schema'
import { requireAuth, getAuth } from '../middleware/auth'

type AuthEnv = {
  Variables: {
    userId: string
  }
}

export const reviewsRouter = new Hono<AuthEnv>()

// GET /:spotId/reviews — list reviews for a spot
reviewsRouter.get('/:spotId/reviews', async (c) => {
  const spotId = c.req.param('spotId')
  const limitParam = c.req.query('limit')
  const limit = Math.min(Number(limitParam ?? 20), 100)

  const rows = await db.query.reviews.findMany({
    where: eq(reviews.spotId, spotId),
    limit,
    orderBy: (reviews, { desc }) => [desc(reviews.createdAt)],
  })

  return c.json({ reviews: rows })
})

// POST /:spotId/reviews — create a review
reviewsRouter.post(
  '/:spotId/reviews',
  requireAuth,
  zValidator('json', CreateReviewSchema),
  async (c) => {
    const clerkId = getAuth(c)
    const spotId = c.req.param('spotId')
    const body = c.req.valid('json')

    const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    const spot = await db.query.spots.findFirst({ where: eq(spots.id, spotId) })
    if (!spot) {
      return c.json({ error: 'Spot not found' }, 404)
    }

    const [created] = await db
      .insert(reviews)
      .values({ ...body, spotId, userId: user.id })
      .returning()

    // Recalculate avgRating and reviewCount from all reviews for this spot
    const statsRows = await db
      .select({
        avgRating: avg(reviews.rating),
        reviewCount: count(reviews.id),
      })
      .from(reviews)
      .where(eq(reviews.spotId, spotId))

    const stats = statsRows[0]

    await db
      .update(spots)
      .set({
        avgRating: stats ? Number(stats.avgRating ?? 0) : 0,
        reviewCount: stats ? Number(stats.reviewCount) : 0,
      })
      .where(eq(spots.id, spotId))

    if (!created) return c.json({ error: 'Failed to create review' }, 500)
    return c.json(created, 201)
  },
)
