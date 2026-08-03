import { z } from 'zod'

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().min(10).max(3000),
})

export const ReviewSchema = z.object({
  id: z.string().uuid(),
  spotId: z.string().uuid(),
  userId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string(),
  helpfulCount: z.number().int().nonnegative(),
  createdAt: z.string(),
})

export type CreateReview = z.infer<typeof CreateReviewSchema>
export type Review = z.infer<typeof ReviewSchema>
