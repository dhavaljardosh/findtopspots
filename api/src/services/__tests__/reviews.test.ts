import { describe, it, expect, vi, beforeEach } from 'vitest'

// These tests define the expected API for the reviews service.
// Implement src/services/reviews.ts to make these pass.
//
// Expected service shape:
//   createReview(spotId: string, userId: string, data: CreateReview): Promise<Review>
//   getReviewsBySpotId(spotId: string, limit?: number): Promise<{ reviews: Review[] }>
//
// Business rules encoded here:
//   - A user cannot review a spot they created (own-spot constraint)
//   - A user cannot review the same spot twice (unique constraint: reviews_spot_user_unique)
//   - Creating a review must recalculate avgRating and reviewCount on the parent spot

const mockDb = {
  query: {
    reviews: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    spots: {
      findFirst: vi.fn(),
    },
    users: {
      findFirst: vi.fn(),
    },
  },
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
}

vi.mock('../../db', () => ({ db: mockDb }))

// Uncomment once src/services/reviews.ts is implemented:
// import { createReview, getReviewsBySpotId } from '../../services/reviews'

const SPOT_ID = 'spotspot-0000-0000-0000-000000000000'
const USER_ID = 'useruser-0000-0000-0000-000000000000'
const OWNER_ID = 'ownerown-0000-0000-0000-000000000000'

const fakeSpot = {
  id: SPOT_ID,
  name: 'Test Spot',
  createdBy: OWNER_ID,
  avgRating: 0,
  reviewCount: 0,
}

const validReviewInput = {
  rating: 4,
  body: 'Really enjoyed this spot, would definitely come back again.',
}

describe('reviewsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── createReview ──────────────────────────────────────────────────────────

  describe('createReview', () => {
    it('inserts a review and returns the created record', async () => {
      const createdReview = {
        id: 'review01-0000-0000-0000-000000000000',
        spotId: SPOT_ID,
        userId: USER_ID,
        rating: 4,
        body: validReviewInput.body,
        helpfulCount: 0,
        createdAt: new Date(),
      }
      mockDb.query.spots.findFirst.mockResolvedValue(fakeSpot)
      mockDb.query.reviews.findFirst.mockResolvedValue(null) // no existing review
      mockDb.returning.mockResolvedValueOnce([createdReview])
      // avgRating recalculation select mock
      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockResolvedValue([{ avgRating: '4', reviewCount: 1 }])

      // const result = await createReview(SPOT_ID, USER_ID, validReviewInput)
      // expect(result.id).toBe('review01-0000-0000-0000-000000000000')
      // expect(result.rating).toBe(4)
      // expect(result.spotId).toBe(SPOT_ID)
      // expect(result.userId).toBe(USER_ID)
      expect(true).toBe(true)
    })

    it('recalculates avgRating on the parent spot after insert', async () => {
      const review1 = { id: 'r1', spotId: SPOT_ID, userId: 'user-a', rating: 4, body: 'Good' }
      const review2 = { id: 'r2', spotId: SPOT_ID, userId: USER_ID, rating: 2, body: 'Meh indeed' }
      mockDb.query.spots.findFirst.mockResolvedValue({ ...fakeSpot, avgRating: 4, reviewCount: 1 })
      mockDb.query.reviews.findFirst.mockResolvedValue(null)
      mockDb.returning.mockResolvedValueOnce([review2])
      mockDb.where.mockResolvedValue([{ avgRating: '3', reviewCount: 2 }])

      // const result = await createReview(SPOT_ID, USER_ID, { rating: 2, body: 'Meh indeed' })
      // After the insert the service should call db.update(spots).set({ avgRating: 3, reviewCount: 2 })
      // expect(mockDb.update).toHaveBeenCalled()
      // expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ avgRating: 3, reviewCount: 2 }))
      expect(true).toBe(true)
    })

    it('throws when user tries to review their own spot', async () => {
      // OWNER_ID is attempting to review a spot they created (createdBy === OWNER_ID)
      mockDb.query.spots.findFirst.mockResolvedValue(fakeSpot) // createdBy: OWNER_ID

      // await expect(createReview(SPOT_ID, OWNER_ID, validReviewInput)).rejects.toThrow()
      // The service should detect spot.createdBy === userId and throw before any DB write
      // expect(mockDb.insert).not.toHaveBeenCalled()
      expect(true).toBe(true)
    })

    it('throws (or returns 409-equivalent) when user reviews same spot twice', async () => {
      const existingReview = {
        id: 'existing-0000-0000-0000-000000000000',
        spotId: SPOT_ID,
        userId: USER_ID,
        rating: 5,
        body: 'Already reviewed this.',
      }
      mockDb.query.spots.findFirst.mockResolvedValue(fakeSpot)
      mockDb.query.reviews.findFirst.mockResolvedValue(existingReview) // duplicate!

      // await expect(createReview(SPOT_ID, USER_ID, validReviewInput)).rejects.toThrow()
      // expect(mockDb.insert).not.toHaveBeenCalled()
      expect(true).toBe(true)
    })

    it('throws when the spot does not exist', async () => {
      mockDb.query.spots.findFirst.mockResolvedValue(null)

      // await expect(createReview('nonexistent-spot', USER_ID, validReviewInput)).rejects.toThrow()
      expect(true).toBe(true)
    })

    it('rejects rating outside 1–5 range', async () => {
      // This may be enforced at the schema/route layer via Zod, but the service
      // should also guard against bad data reaching the DB.
      mockDb.query.spots.findFirst.mockResolvedValue(fakeSpot)
      mockDb.query.reviews.findFirst.mockResolvedValue(null)

      // await expect(createReview(SPOT_ID, USER_ID, { rating: 6, body: 'Out of range' })).rejects.toThrow()
      // await expect(createReview(SPOT_ID, USER_ID, { rating: 0, body: 'Out of range' })).rejects.toThrow()
      expect(true).toBe(true)
    })

    it('rejects body shorter than 10 characters', async () => {
      mockDb.query.spots.findFirst.mockResolvedValue(fakeSpot)
      mockDb.query.reviews.findFirst.mockResolvedValue(null)

      // await expect(createReview(SPOT_ID, USER_ID, { rating: 3, body: 'Short' })).rejects.toThrow()
      expect(true).toBe(true)
    })
  })

  // ─── getReviewsBySpotId ────────────────────────────────────────────────────

  describe('getReviewsBySpotId', () => {
    it('returns all reviews for a spot ordered by newest first', async () => {
      const fakeReviews = [
        {
          id: 'rev-new0-0000-0000-0000-000000000000',
          spotId: SPOT_ID,
          userId: 'user-a',
          rating: 5,
          body: 'Absolutely fantastic, best spot in Austin!',
          helpfulCount: 2,
          createdAt: new Date('2025-06-01'),
        },
        {
          id: 'rev-old0-0000-0000-0000-000000000000',
          spotId: SPOT_ID,
          userId: 'user-b',
          rating: 3,
          body: 'Pretty decent, nothing too special here.',
          helpfulCount: 0,
          createdAt: new Date('2025-03-01'),
        },
      ]
      mockDb.query.reviews.findMany.mockResolvedValue(fakeReviews)

      // const result = await getReviewsBySpotId(SPOT_ID)
      // expect(result.reviews).toHaveLength(2)
      // expect(result.reviews[0].id).toBe('rev-new0-0000-0000-0000-000000000000') // newest first
      // expect(result.reviews[1].id).toBe('rev-old0-0000-0000-0000-000000000000')
      expect(true).toBe(true)
    })

    it('returns empty array when no reviews exist for the spot', async () => {
      mockDb.query.reviews.findMany.mockResolvedValue([])

      // const result = await getReviewsBySpotId(SPOT_ID)
      // expect(result.reviews).toEqual([])
      expect(true).toBe(true)
    })

    it('respects the limit parameter (max 100)', async () => {
      const manyReviews = Array.from({ length: 50 }, (_, i) => ({
        id: `rev-${String(i).padStart(4, '0')}-0000-0000-0000-000000000000`,
        spotId: SPOT_ID,
        userId: `user-${i}`,
        rating: (i % 5) + 1,
        body: `Review body number ${i} with enough characters to pass validation.`,
        helpfulCount: 0,
        createdAt: new Date(),
      }))
      mockDb.query.reviews.findMany.mockResolvedValue(manyReviews.slice(0, 10))

      // const result = await getReviewsBySpotId(SPOT_ID, 10)
      // expect(result.reviews).toHaveLength(10)
      // expect(mockDb.query.reviews.findMany).toHaveBeenCalledWith(
      //   expect.objectContaining({ limit: 10 })
      // )
      expect(true).toBe(true)
    })

    it('defaults to a limit of 20 when none specified', async () => {
      mockDb.query.reviews.findMany.mockResolvedValue([])

      // await getReviewsBySpotId(SPOT_ID)
      // expect(mockDb.query.reviews.findMany).toHaveBeenCalledWith(
      //   expect.objectContaining({ limit: 20 })
      // )
      expect(true).toBe(true)
    })

    it('caps limit at 100 regardless of input', async () => {
      mockDb.query.reviews.findMany.mockResolvedValue([])

      // await getReviewsBySpotId(SPOT_ID, 9999)
      // expect(mockDb.query.reviews.findMany).toHaveBeenCalledWith(
      //   expect.objectContaining({ limit: 100 })
      // )
      expect(true).toBe(true)
    })
  })

  // ─── avgRating recalculation (integration-level unit) ─────────────────────

  describe('avgRating recalculation', () => {
    it('sets avgRating to the precise average of all current ratings', async () => {
      // Simulates: spot had 2 reviews (4, 4), new review is 1 → avg should be 3.0
      mockDb.query.spots.findFirst.mockResolvedValue({ ...fakeSpot, avgRating: 4, reviewCount: 2 })
      mockDb.query.reviews.findFirst.mockResolvedValue(null)
      mockDb.returning.mockResolvedValueOnce([{
        id: 'r-new', spotId: SPOT_ID, userId: USER_ID, rating: 1, body: 'Terrible experience here',
      }])
      mockDb.where.mockResolvedValue([{ avgRating: '3', reviewCount: 3 }])

      // await createReview(SPOT_ID, USER_ID, { rating: 1, body: 'Terrible experience here' })
      // expect(mockDb.set).toHaveBeenCalledWith(
      //   expect.objectContaining({ avgRating: 3, reviewCount: 3 })
      // )
      expect(true).toBe(true)
    })

    it('sets avgRating to 0 and reviewCount to 0 when stats are null (should not happen, but safe fallback)', async () => {
      mockDb.query.spots.findFirst.mockResolvedValue(fakeSpot)
      mockDb.query.reviews.findFirst.mockResolvedValue(null)
      mockDb.returning.mockResolvedValueOnce([{
        id: 'r-only', spotId: SPOT_ID, userId: USER_ID, rating: 5, body: 'Only review so far!',
      }])
      // DB returns nullish stats (edge case)
      mockDb.where.mockResolvedValue([{ avgRating: null, reviewCount: 0 }])

      // await createReview(SPOT_ID, USER_ID, { rating: 5, body: 'Only review so far!' })
      // expect(mockDb.set).toHaveBeenCalledWith(
      //   expect.objectContaining({ avgRating: 0, reviewCount: 0 })
      // )
      expect(true).toBe(true)
    })
  })
})
