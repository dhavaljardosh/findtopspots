import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { ilike, or, desc, lt, and, inArray, sql, type SQL } from 'drizzle-orm'
import { db } from '../db'
import { spots, spotPhotos } from '../db/schema'
import { SpotCategorySchema } from '@fts/types'
import { searchByText, mapGoogleTypesToCategory } from '../services/google-places'

export const placesRouter = new Hono()

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Austin,TX': { lat: 30.2672, lng: -97.7431 },
  'Houston,TX': { lat: 29.7604, lng: -95.3698 },
  'Dallas,TX': { lat: 32.7767, lng: -96.797 },
  'New York,NY': { lat: 40.7128, lng: -74.006 },
  'San Francisco,CA': { lat: 37.7749, lng: -122.4194 },
  'Chicago,IL': { lat: 41.8781, lng: -87.6298 },
  'Seattle,WA': { lat: 47.6062, lng: -122.3321 },
}

const AUSTIN = CITY_COORDS['Austin,TX']!

const AutocompleteQuerySchema = z.object({
  q: z.string().min(1).max(200),
  near: z.string().default('Austin,TX'),
})

// GET /places/autocomplete — unified autocomplete for Add Spot form
placesRouter.get('/autocomplete', zValidator('query', AutocompleteQuerySchema), async (c) => {
  const { q, near } = c.req.valid('query')

  const coords = CITY_COORDS[near] ?? AUSTIN

  // DB search + Google Places search in parallel
  const [dbResults, googleResults] = await Promise.all([
    db.query.spots.findMany({
      where: or(ilike(spots.name, `%${q}%`), ilike(spots.address, `%${q}%`)),
      orderBy: [desc(spots.avgRating)],
      limit: 3,
    }),
    searchByText(q, coords.lat, coords.lng),
  ])

  const suggestions: Array<{
    foursquareId?: string
    googlePlaceId?: string
    name: string
    address: string
    lat: number
    lng: number
    category: string
  }> = googleResults.map((r) => ({
    googlePlaceId: r.googlePlaceId,
    name: r.name,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    category: mapGoogleTypesToCategory(r.types ?? []),
  }))

  const existingNames = new Set(dbResults.map((s) => s.name.toLowerCase()))
  const newSuggestions = suggestions.filter((r) => !existingNames.has(r.name.toLowerCase()))

  return c.json({
    existing: dbResults.map((s) => ({
      type: 'existing' as const,
      id: s.id,
      name: s.name,
      address: s.address,
      category: s.category,
      lat: s.lat,
      lng: s.lng,
      avgRating: s.avgRating,
      reviewCount: s.reviewCount,
    })),
    suggestions: newSuggestions.slice(0, 6).map((r) => ({
      type: 'suggestion' as const,
      foursquareId: r.foursquareId,
      googlePlaceId: r.googlePlaceId,
      name: r.name,
      address: r.address,
      category: r.category,
      lat: r.lat,
      lng: r.lng,
    })),
  })
})

// GET /places/fsq/:fsqId — fetch Foursquare place details for form pre-fill
placesRouter.get('/fsq/:fsqId', async (c) => {
  const { getPlaceById } = await import('../services/foursquare')
  const fsqId = c.req.param('fsqId')
  const place = await getPlaceById(fsqId)
  if (!place) return c.json({ error: 'Not found' }, 404)
  return c.json({
    description: place.description ?? null,
    coverPhotoUrl: place.coverPhotoUrl ?? null,
    isOpenNow: place.isOpenNow ?? null,
    category: place.category,
  })
})

// GET /places/google/:placeId — fetch Google Place details for form pre-fill
// Returns display data only — never stored in DB
placesRouter.get('/google/:placeId', async (c) => {
  const placeId = c.req.param('placeId')
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return c.json({ description: null, coverPhotoUrl: null }, 200)

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'editorialSummary,photos',
        },
      },
    )
    if (!res.ok) return c.json({ description: null, coverPhotoUrl: null }, 200)

    const data = await res.json() as {
      editorialSummary?: { text?: string }
      photos?: Array<{ name?: string }>
    }

    const description = data.editorialSummary?.text ?? null

    // Build a proxy URL for the first photo (display only — served via redirect)
    const photoName = data.photos?.[0]?.name
    const coverPhotoUrl = photoName
      ? `https://places.googleapis.com/v1/${photoName}/media?key=${apiKey}&maxWidthPx=800&skipHttpRedirect=true`
      : null

    return c.json({ description, coverPhotoUrl })
  } catch {
    return c.json({ description: null, coverPhotoUrl: null }, 200)
  }
})

// GET /places/search — full search powering the browse page
const SearchQuerySchema = z.object({
  q: z.string().optional(),
  category: SpotCategorySchema.optional(),
  near: z.string().optional(),
  city: z.string().optional(),
  limit: z.coerce.number().max(100).default(60),
  cursor: z.string().optional(),
})

placesRouter.get('/search', zValidator('query', SearchQuerySchema), async (c) => {
  const { q, category, city, limit, cursor } = c.req.valid('query')

  const conditions: SQL[] = []

  if (q) {
    conditions.push(
      or(
        ilike(spots.name, `%${q}%`),
        ilike(spots.description, `%${q}%`),
        ilike(spots.address, `%${q}%`),
        sql`similarity(${spots.name}, ${q}) > 0.3`,
        sql`similarity(replace(${spots.name}, ' ', ''), replace(${q}, ' ', '')) > 0.3`,
      )!,
    )
  }

  if (category) {
    const { eq } = await import('drizzle-orm')
    conditions.push(eq(spots.category, category))
  }

  if (city) {
    conditions.push(ilike(spots.address, `%${city}%`))
  }

  if (cursor) {
    conditions.push(lt(spots.createdAt, new Date(cursor)))
  }

  const rows = await db.query.spots.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(spots.avgRating), desc(spots.reviewCount)],
    limit: limit + 1,
  })

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? items.at(-1)?.createdAt?.toISOString() : undefined

  // Batch fetch photos for all spots in one query
  const spotIds = items.map((s) => s.id)
  const allPhotos = spotIds.length > 0
    ? await db.select({ spotId: spotPhotos.spotId, id: spotPhotos.id, url: spotPhotos.url })
        .from(spotPhotos)
        .where(inArray(spotPhotos.spotId, spotIds))
    : []
  const photosBySpot = new Map<string, Array<{ id: string; url: string }>>()
  for (const p of allPhotos) {
    const arr = photosBySpot.get(p.spotId) ?? []
    arr.push({ id: p.id, url: p.url })
    photosBySpot.set(p.spotId, arr)
  }

  const spotsWithPhotos = items.map((s) => ({ ...s, photos: photosBySpot.get(s.id) ?? [] }))

  return c.json({ spots: spotsWithPhotos, nextCursor, total: spotsWithPhotos.length })
})

// GET /places/geocode — resolve a free-text address to lat/lng via Google Places text search
const GeocodeQuerySchema = z.object({
  address: z.string().min(1).max(500),
  near: z.string().default('Austin,TX'),
})


placesRouter.get('/geocode', zValidator('query', GeocodeQuerySchema), async (c) => {
  const { address, near } = c.req.valid('query')
  const coords = CITY_COORDS[near] ?? AUSTIN
  const results = await searchByText(address, coords.lat, coords.lng)
  const first = results[0]
  if (!first) {
    return c.json({ error: 'Address not found' }, 404)
  }
  return c.json({ lat: first.lat, lng: first.lng, address: first.address, googlePlaceId: first.googlePlaceId })
})
