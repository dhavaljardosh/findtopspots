import { z } from 'zod'

export const SpotCategorySchema = z.enum([
  'restaurant',
  'cafe',
  'bar',
  'park',
  'gym',
  'shop',
  'attraction',
  'other',
])

export const CreateSpotSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(2000),
  category: SpotCategorySchema,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(5).max(300),
  tags: z.array(z.string()).max(10).optional(),
})

export const SpotSchema = CreateSpotSchema.extend({
  id: z.string().uuid(),
  createdBy: z.string().uuid(),
  avgRating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  voteCount: z.number().int().nonnegative().optional().default(0),
  viewCount: z.number().int().nonnegative().optional().default(0),
  coverPhotoUrl: z.string().url().nullable().optional(),
  isVerifiedBusiness: z.boolean().optional().default(false),
  status: z.string().optional().default('live'),
  googlePlaceId: z.string().optional().nullable(),
  foursquareId: z.string().optional().nullable(),
  photos: z.array(z.object({ id: z.string(), url: z.string() })).optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string(),
  // Fields returned when authed
  userVoted: z.boolean().optional(),
  dbUserId: z.string().nullable().optional(),
})

export const UpdateSpotSchema = CreateSpotSchema.partial()

export const SpotQuerySchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  tag: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radiusKm: z.coerce.number().max(100).default(10).optional(),
  category: SpotCategorySchema.optional(),
  limit: z.coerce.number().max(100).default(20),
  cursor: z.string().optional(),
  sort: z.enum(['top', 'recent', 'new']).optional(),
})

export type SpotCategory = z.infer<typeof SpotCategorySchema>
export type CreateSpot = z.infer<typeof CreateSpotSchema>
export type Spot = z.infer<typeof SpotSchema>
export type UpdateSpot = z.infer<typeof UpdateSpotSchema>
export type SpotQuery = z.infer<typeof SpotQuerySchema>
