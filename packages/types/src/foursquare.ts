import { z } from 'zod'

// Foursquare Places API v3 response shapes

export const FoursquareHoursSchema = z.object({
  display: z.string().optional(),
  is_local_holiday: z.boolean().optional(),
  open_now: z.boolean().optional(),
  regular: z.array(z.object({
    close: z.string(),
    day: z.number(),
    open: z.string(),
  })).optional(),
})

export const FoursquarePlaceSchema = z.object({
  fsq_id: z.string(),
  name: z.string(),
  location: z.object({
    address: z.string().optional(),
    country: z.string().optional(),
    cross_street: z.string().optional(),
    formatted_address: z.string().optional(),
    locality: z.string().optional(),
    postcode: z.string().optional(),
    region: z.string().optional(),
  }),
  geocodes: z.object({
    main: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
  }),
  categories: z.array(z.object({
    id: z.number(),
    name: z.string(),
    short_name: z.string(),
    icon: z.object({ prefix: z.string(), suffix: z.string() }),
  })),
  rating: z.number().optional(),
  price: z.number().optional(), // 1-4
  hours: FoursquareHoursSchema.optional(),
  tel: z.string().optional(),
  website: z.string().optional(),
  photos: z.array(z.object({
    id: z.string(),
    prefix: z.string(),
    suffix: z.string(),
    width: z.number(),
    height: z.number(),
  })).optional(),
  stats: z.object({
    total_ratings: z.number().optional(),
    total_tips: z.number().optional(),
    total_photos: z.number().optional(),
  }).optional(),
  popularity: z.number().optional(), // 0-1, unique to Foursquare
  description: z.string().optional(),
})

export const FoursquareSearchResponseSchema = z.object({
  results: z.array(FoursquarePlaceSchema),
})

// What we store in our DB after normalizing Foursquare data
export const FoursquareSpotDataSchema = z.object({
  foursquareId: z.string(),
  name: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  category: z.string(), // mapped to our SpotCategory
  phone: z.string().optional(),
  website: z.string().optional(),
  priceLevel: z.number().optional(),
  popularity: z.number().optional(),
  coverPhotoUrl: z.string().optional(),
  rating: z.number().optional(),
  description: z.string().optional(),
  isOpenNow: z.boolean().optional(),
})

export type FoursquarePlace = z.infer<typeof FoursquarePlaceSchema>
export type FoursquareSpotData = z.infer<typeof FoursquareSpotDataSchema>
