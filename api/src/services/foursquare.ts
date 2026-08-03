import type { FoursquarePlace, FoursquareSpotData, SpotCategory } from '@fts/types'
import { FoursquareSearchResponseSchema, FoursquarePlaceSchema } from '@fts/types'

const FSQ_BASE_URL = 'https://api.foursquare.com/v3'

// ─── Category Mapping ─────────────────────────────────────────────────────────

const FSQ_CATEGORY_MAP: Record<string, SpotCategory> = {
  Restaurant: 'restaurant',
  Café: 'cafe',
  'Coffee Shop': 'cafe',
  Bar: 'bar',
  Park: 'park',
  Gym: 'gym',
  'Fitness Center': 'gym',
  Shop: 'shop',
  Store: 'shop',
  Boutique: 'shop',
  Attraction: 'attraction',
  Museum: 'attraction',
  Theater: 'attraction',
}

function mapFsqCategory(shortName: string): SpotCategory {
  return FSQ_CATEGORY_MAP[shortName] ?? 'other'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getApiKey(): string | null {
  const key = process.env.FOURSQUARE_API_KEY
  if (!key) {
    console.warn('[foursquare] FOURSQUARE_API_KEY is not set — Foursquare calls will be skipped')
    return null
  }
  return key
}

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: apiKey,
    Accept: 'application/json',
  }
}

const FSQ_PLACE_FIELDS =
  'fsq_id,name,location,geocodes,categories,rating,price,hours,tel,website,photos,stats,popularity,description'

function normalizeFsqPlace(place: FoursquarePlace): FoursquareSpotData {
  const firstCategory = place.categories[0]
  const category = firstCategory ? mapFsqCategory(firstCategory.short_name) : 'other'

  const address =
    place.location.formatted_address ??
    [place.location.address, place.location.locality, place.location.region]
      .filter(Boolean)
      .join(', ') ??
    ''

  const coverPhotoUrl = place.photos?.[0]
    ? `${place.photos[0].prefix}300x300${place.photos[0].suffix}`
    : undefined

  return {
    foursquareId: place.fsq_id,
    name: place.name,
    address,
    lat: place.geocodes.main.latitude,
    lng: place.geocodes.main.longitude,
    category,
    phone: place.tel,
    website: place.website,
    priceLevel: place.price,
    popularity: place.popularity,
    coverPhotoUrl,
    rating: place.rating,
    description: place.description,
    isOpenNow: place.hours?.open_now,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface FoursquareAutocompleteSuggestion {
  foursquareId: string
  name: string
  address: string
  lat: number
  lng: number
  category: SpotCategory
}

/**
 * Autocomplete using Foursquare /v3/autocomplete (different from deprecated /places/search).
 * Returns [] on any error.
 */
export async function autocompleteByText(
  query: string,
  lat: number,
  lng: number,
): Promise<FoursquareAutocompleteSuggestion[]> {
  const apiKey = getApiKey()
  if (!apiKey) return []

  try {
    const params = new URLSearchParams({
      query,
      ll: `${lat},${lng}`,
      types: 'Place',
      limit: '8',
    })

    const res = await fetch(`${FSQ_BASE_URL}/autocomplete?${params.toString()}`, {
      headers: buildHeaders(apiKey),
    })

    if (!res.ok) {
      console.error(`[foursquare] autocompleteByText("${query}") failed: ${res.status} ${res.statusText}`)
      return []
    }

    const data = (await res.json()) as {
      results?: Array<{
        type?: string
        place?: {
          fsq_id?: string
          name?: string
          location?: {
            formatted_address?: string
            address?: string
            locality?: string
            region?: string
          }
          geocodes?: { main?: { latitude?: number; longitude?: number } }
          categories?: Array<{ short_name?: string }>
        }
      }>
    }

    if (!data.results) return []

    return data.results
      .filter(
        (r) =>
          r.type === 'Place' &&
          r.place?.fsq_id &&
          r.place?.geocodes?.main?.latitude &&
          r.place?.geocodes?.main?.longitude,
      )
      .map((r) => {
        const p = r.place!
        const loc = p.location ?? {}
        const address =
          loc.formatted_address ??
          [loc.address, loc.locality, loc.region].filter(Boolean).join(', ') ??
          ''
        const shortName = p.categories?.[0]?.short_name ?? ''
        return {
          foursquareId: p.fsq_id!,
          name: p.name ?? '',
          address,
          lat: p.geocodes!.main!.latitude!,
          lng: p.geocodes!.main!.longitude!,
          category: mapFsqCategory(shortName),
        }
      })
  } catch (err) {
    console.error(`[foursquare] autocompleteByText("${query}") error:`, err)
    return []
  }
}

/**
 * Search Foursquare Places by text query near a lat/lng.
 * Returns normalized FoursquareSpotData[]. Returns [] on any error.
 */
export async function searchPlaces(
  query: string,
  lat: number,
  lng: number,
  radiusMeters = 5000,
): Promise<FoursquareSpotData[]> {
  const apiKey = getApiKey()
  if (!apiKey) return []

  try {
    const params = new URLSearchParams({
      query,
      ll: `${lat},${lng}`,
      radius: String(radiusMeters),
      fields: FSQ_PLACE_FIELDS,
    })

    const res = await fetch(`${FSQ_BASE_URL}/places/search?${params.toString()}`, {
      headers: buildHeaders(apiKey),
    })

    if (!res.ok) {
      console.error(`[foursquare] searchPlaces failed: ${res.status} ${res.statusText}`)
      return []
    }

    const raw = await res.json()
    const parsed = FoursquareSearchResponseSchema.safeParse(raw)

    if (!parsed.success) {
      console.error('[foursquare] searchPlaces parse error:', parsed.error.message)
      return []
    }

    return parsed.data.results.map(normalizeFsqPlace)
  } catch (err) {
    console.error('[foursquare] searchPlaces error:', err)
    return []
  }
}

/**
 * Fetch a single place by Foursquare ID.
 * Returns null on any error or if not found.
 */
export async function getPlaceById(fsqId: string): Promise<FoursquareSpotData | null> {
  const apiKey = getApiKey()
  if (!apiKey) return null

  try {
    const params = new URLSearchParams({ fields: FSQ_PLACE_FIELDS })
    const res = await fetch(`${FSQ_BASE_URL}/places/${encodeURIComponent(fsqId)}?${params.toString()}`, {
      headers: buildHeaders(apiKey),
    })

    if (!res.ok) {
      console.error(`[foursquare] getPlaceById(${fsqId}) failed: ${res.status} ${res.statusText}`)
      return null
    }

    const raw = await res.json()
    const parsed = FoursquarePlaceSchema.safeParse(raw)

    if (!parsed.success) {
      console.error(`[foursquare] getPlaceById(${fsqId}) parse error:`, parsed.error.message)
      return null
    }

    return normalizeFsqPlace(parsed.data)
  } catch (err) {
    console.error(`[foursquare] getPlaceById(${fsqId}) error:`, err)
    return null
  }
}

/**
 * Fetch up to 5 photo URLs for a place.
 * Returns [] on any error.
 */
export async function getPlacePhotos(fsqId: string): Promise<string[]> {
  const apiKey = getApiKey()
  if (!apiKey) return []

  try {
    const params = new URLSearchParams({ limit: '5' })
    const res = await fetch(
      `${FSQ_BASE_URL}/places/${encodeURIComponent(fsqId)}/photos?${params.toString()}`,
      { headers: buildHeaders(apiKey) },
    )

    if (!res.ok) {
      console.error(`[foursquare] getPlacePhotos(${fsqId}) failed: ${res.status} ${res.statusText}`)
      return []
    }

    const raw = (await res.json()) as Array<{ prefix: string; suffix: string }>
    if (!Array.isArray(raw)) return []

    return raw.map((p) => `${p.prefix}800x600${p.suffix}`)
  } catch (err) {
    console.error(`[foursquare] getPlacePhotos(${fsqId}) error:`, err)
    return []
  }
}
