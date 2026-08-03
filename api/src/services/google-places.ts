/**
 * Google Places API (New) service.
 *
 * IMPORTANT: Google data must NEVER be stored in DB. Display live only.
 * All functions return null/[] on any error so callers degrade gracefully.
 */

const GOOGLE_BASE_URL = 'https://places.googleapis.com/v1'

// ─── Price Level Mapping ──────────────────────────────────────────────────────

const PRICE_LEVEL_MAP: Record<string, string> = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GoogleLiveData {
  isOpenNow: boolean | null
  hours: string | null
  googleRating: number | null
  googleReviewCount: number | null
  priceLevel: string | null
}

export interface GooglePlaceSearchResult {
  googlePlaceId: string
  name: string
  address: string
  lat: number
  lng: number
  types?: string[]
}

const GOOGLE_TYPE_TO_CATEGORY: Record<string, string> = {
  restaurant: 'restaurant',
  food: 'restaurant',
  meal_takeaway: 'restaurant',
  meal_delivery: 'restaurant',
  bar: 'bar',
  night_club: 'bar',
  liquor_store: 'bar',
  cafe: 'cafe',
  coffee_shop: 'cafe',
  bakery: 'cafe',
  park: 'park',
  national_park: 'park',
  campground: 'park',
  natural_feature: 'park',
  gym: 'gym',
  fitness_center: 'gym',
  health: 'gym',
  sports_complex: 'gym',
  shopping_mall: 'shop',
  store: 'shop',
  supermarket: 'shop',
  clothing_store: 'shop',
  shoe_store: 'shop',
  book_store: 'shop',
  tourist_attraction: 'attraction',
  museum: 'attraction',
  amusement_park: 'attraction',
  art_gallery: 'attraction',
  aquarium: 'attraction',
  zoo: 'attraction',
  stadium: 'attraction',
}

export function mapGoogleTypesToCategory(types: string[]): string {
  for (const t of types) {
    const cat = GOOGLE_TYPE_TO_CATEGORY[t]
    if (cat) return cat
  }
  return 'other'
}

export interface GoogleAutocompleteSuggestion {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
  category: string
}

export interface GooglePlaceDetails {
  googlePlaceId: string
  name: string
  address: string
  lat: number
  lng: number
  phone: string | null
  website: string | null
  priceLevel: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getApiKey(): string | null {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) {
    console.warn('[google-places] GOOGLE_PLACES_API_KEY is not set — Google Places calls will be skipped')
    return null
  }
  return key
}

function nullLiveData(): GoogleLiveData {
  return {
    isOpenNow: null,
    hours: null,
    googleRating: null,
    googleReviewCount: null,
    priceLevel: null,
  }
}

/**
 * Convert Google's regularOpeningHours.weekdayDescriptions[] into a single
 * human-readable string. Google returns one string per day of the week, e.g.:
 * ["Monday: 9:00 AM – 10:00 PM", "Tuesday: 9:00 AM – 10:00 PM", …]
 * We join with " | " and trim to keep it compact.
 */
function formatHours(weekdayDescriptions: string[] | undefined): string | null {
  if (!weekdayDescriptions || weekdayDescriptions.length === 0) return null
  return weekdayDescriptions.join(' | ')
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch live data for a Google Place ID.
 * Returns all-nulls on missing API key or any request failure.
 * MUST NOT be stored in DB — display only.
 */
export async function getPlaceLiveData(googlePlaceId: string): Promise<GoogleLiveData> {
  const apiKey = getApiKey()
  if (!apiKey) return nullLiveData()

  try {
    const res = await fetch(`${GOOGLE_BASE_URL}/places/${encodeURIComponent(googlePlaceId)}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'id,displayName,regularOpeningHours,currentOpeningHours,rating,userRatingCount,priceLevel,websiteUri,nationalPhoneNumber',
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      console.error(`[google-places] getPlaceLiveData(${googlePlaceId}) failed: ${res.status} ${res.statusText}`)
      return nullLiveData()
    }

    const data = (await res.json()) as {
      id?: string
      displayName?: { text?: string }
      regularOpeningHours?: {
        weekdayDescriptions?: string[]
        openNow?: boolean
      }
      currentOpeningHours?: {
        openNow?: boolean
        weekdayDescriptions?: string[]
      }
      rating?: number
      userRatingCount?: number
      priceLevel?: string
      websiteUri?: string
      nationalPhoneNumber?: string
    }

    // Prefer currentOpeningHours.openNow (real-time), fall back to regularOpeningHours
    const isOpenNow =
      data.currentOpeningHours?.openNow ??
      data.regularOpeningHours?.openNow ??
      null

    const hours = formatHours(
      data.currentOpeningHours?.weekdayDescriptions ??
        data.regularOpeningHours?.weekdayDescriptions,
    )

    const priceRaw = data.priceLevel
    const priceLevel = priceRaw ? (PRICE_LEVEL_MAP[priceRaw] ?? priceRaw) : null

    return {
      isOpenNow,
      hours,
      googleRating: data.rating ?? null,
      googleReviewCount: data.userRatingCount ?? null,
      priceLevel,
    }
  } catch (err) {
    console.error(`[google-places] getPlaceLiveData(${googlePlaceId}) error:`, err)
    return nullLiveData()
  }
}

/**
 * Autocomplete place suggestions as the user types.
 * Uses Google Places New API /places:autocomplete.
 * Returns [] on missing API key or any request failure.
 */
export async function autocompletePlace(
  input: string,
  lat: number,
  lng: number,
): Promise<GoogleAutocompleteSuggestion[]> {
  const apiKey = getApiKey()
  if (!apiKey) return []

  try {
    const body = {
      input,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 50000.0,
        },
      },
      includedPrimaryTypes: [
        'restaurant',
        'cafe',
        'bar',
        'food',
        'store',
        'lodging',
        'tourist_attraction',
        'park',
        'gym',
        'spa',
        'movie_theater',
        'shopping_mall',
        'night_club',
      ],
    }

    const res = await fetch(`${GOOGLE_BASE_URL}/places:autocomplete`, {
      method: 'POST',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.error(`[google-places] autocompletePlace("${input}") failed: ${res.status} ${res.statusText}`)
      return []
    }

    const data = (await res.json()) as {
      suggestions?: Array<{
        placePrediction?: {
          placeId?: string
          text?: { text?: string }
          structuredFormat?: {
            mainText?: { text?: string }
            secondaryText?: { text?: string }
          }
          types?: string[]
        }
      }>
    }

    if (!data.suggestions) return []

    // Resolve each suggestion to full details (lat/lng required for form fill)
    const resolved = await Promise.all(
      data.suggestions
        .filter((s) => s.placePrediction?.placeId)
        .slice(0, 5)
        .map(async (s) => {
          const pred = s.placePrediction!
          const placeId = pred.placeId!
          const name = pred.structuredFormat?.mainText?.text ?? pred.text?.text ?? ''
          const address = pred.structuredFormat?.secondaryText?.text ?? ''
          const primaryType = pred.types?.[0] ?? 'establishment'

          const details = await getPlaceDetails(placeId)
          if (!details) return null

          return {
            placeId,
            name,
            address: details.address || address,
            lat: details.lat,
            lng: details.lng,
            category: mapGoogleTypeToCat(primaryType),
          } satisfies GoogleAutocompleteSuggestion
        }),
    )

    return resolved.filter((r): r is GoogleAutocompleteSuggestion => r !== null)
  } catch (err) {
    console.error(`[google-places] autocompletePlace("${input}") error:`, err)
    return []
  }
}

/**
 * Fetch full place details (lat/lng, address, phone, website) by Google Place ID.
 * Returns null on missing API key or any request failure.
 */
export async function getPlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
  const apiKey = getApiKey()
  if (!apiKey) return null

  try {
    const res = await fetch(`${GOOGLE_BASE_URL}/places/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'id,displayName,formattedAddress,location,nationalPhoneNumber,websiteUri,priceLevel',
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      console.error(`[google-places] getPlaceDetails(${placeId}) failed: ${res.status} ${res.statusText}`)
      return null
    }

    const data = (await res.json()) as {
      id?: string
      displayName?: { text?: string }
      formattedAddress?: string
      location?: { latitude?: number; longitude?: number }
      nationalPhoneNumber?: string
      websiteUri?: string
      priceLevel?: string
    }

    if (!data.location?.latitude || !data.location?.longitude) return null

    const priceRaw = data.priceLevel
    const priceLevel = priceRaw ? (PRICE_LEVEL_MAP[priceRaw] ?? priceRaw) : null

    return {
      googlePlaceId: data.id ?? placeId,
      name: data.displayName?.text ?? '',
      address: data.formattedAddress ?? '',
      lat: data.location.latitude,
      lng: data.location.longitude,
      phone: data.nationalPhoneNumber ?? null,
      website: data.websiteUri ?? null,
      priceLevel,
    }
  } catch (err) {
    console.error(`[google-places] getPlaceDetails(${placeId}) error:`, err)
    return null
  }
}

function mapGoogleTypeToCat(googleType: string): string {
  const map: Record<string, string> = {
    restaurant: 'restaurant',
    cafe: 'cafe',
    bar: 'bar',
    night_club: 'bar',
    food: 'restaurant',
    store: 'shop',
    shopping_mall: 'shop',
    lodging: 'hotel',
    tourist_attraction: 'attraction',
    park: 'park',
    gym: 'gym',
    spa: 'spa',
    movie_theater: 'entertainment',
  }
  return map[googleType] ?? 'other'
}

/**
 * Search Google Places by text query near a lat/lng.
 * Returns [] on missing API key or any request failure.
 * Use the returned googlePlaceId to store alongside our spot for future live lookups.
 */
export async function searchByText(
  query: string,
  lat: number,
  lng: number,
): Promise<GooglePlaceSearchResult[]> {
  const apiKey = getApiKey()
  if (!apiKey) return []

  try {
    const body = {
      textQuery: query,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 5000.0,
        },
      },
    }

    const res = await fetch(`${GOOGLE_BASE_URL}/places:searchText`, {
      method: 'POST',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.error(`[google-places] searchByText("${query}") failed: ${res.status} ${res.statusText}`)
      return []
    }

    const data = (await res.json()) as {
      places?: Array<{
        id?: string
        displayName?: { text?: string }
        formattedAddress?: string
        location?: { latitude?: number; longitude?: number }
        types?: string[]
      }>
    }

    if (!data.places || !Array.isArray(data.places)) return []

    return data.places
      .filter((p) => p.id && p.displayName?.text && p.location?.latitude && p.location?.longitude)
      .map((p) => ({
        googlePlaceId: p.id!,
        name: p.displayName!.text!,
        address: p.formattedAddress ?? '',
        lat: p.location!.latitude!,
        lng: p.location!.longitude!,
        types: p.types ?? [],
      }))
  } catch (err) {
    console.error(`[google-places] searchByText("${query}") error:`, err)
    return []
  }
}
