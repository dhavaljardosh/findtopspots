import { ofetch } from 'ofetch'
import type {
  Spot,
  SpotQuery,
  CreateSpot,
  Review,
  CreateReview,
  User,
} from '@fts/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const api = ofetch.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function getSpots(
  query: SpotQuery,
): Promise<{ spots: Spot[]; nextCursor?: string }> {
  const params: Record<string, string> = {}
  if (query.q !== undefined) params['q'] = query.q
  if (query.city !== undefined) params['city'] = query.city
  if (query.tag !== undefined) params['tag'] = query.tag
  if (query.lat !== undefined) params['lat'] = String(query.lat)
  if (query.lng !== undefined) params['lng'] = String(query.lng)
  if (query.radiusKm !== undefined) params['radiusKm'] = String(query.radiusKm)
  if (query.category !== undefined) params['category'] = query.category
  if (query.limit !== undefined) params['limit'] = String(query.limit)
  if (query.cursor !== undefined) params['cursor'] = query.cursor
  if (query.sort !== undefined) params['sort'] = query.sort

  return api('/api/v1/spots', { query: params })
}

export async function getSpot(id: string, token?: string): Promise<Spot & { dbUserId?: string | null; userVoted?: boolean }> {
  return api(`/api/v1/spots/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

export async function createSpot(
  data: CreateSpot & Record<string, unknown>,
  token?: string,
): Promise<Spot> {
  return api('/api/v1/spots', {
    method: 'POST',
    body: data,
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : {},
  })
}

export async function getSpotReviews(spotId: string): Promise<Review[]> {
  const data = await api<{ reviews: Review[] }>(`/api/v1/spots/${spotId}/reviews`)
  return data.reviews ?? []
}

export async function createReview(
  spotId: string,
  data: CreateReview,
  token?: string,
): Promise<Review> {
  return api(`/api/v1/spots/${spotId}/reviews`, {
    method: 'POST',
    body: data,
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : {},
  })
}

export async function getCurrentUser(token?: string): Promise<User> {
  return api('/api/v1/users/me', {
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : {},
  })
}

// ─── Place autocomplete ───────────────────────────────────────────────────────

export interface AutocompleteExistingResult {
  type: 'existing'
  id: string
  name: string
  address: string
  category: string
  lat: number
  lng: number
  avgRating: number
  reviewCount: number
}

export interface AutocompleteSuggestion {
  type: 'suggestion'
  foursquareId?: string
  googlePlaceId?: string
  name: string
  address: string
  category: string
  lat: number
  lng: number
}

export interface AutocompleteResponse {
  existing: AutocompleteExistingResult[]
  suggestions: AutocompleteSuggestion[]
}

export async function autocompletePlace(
  q: string,
  near = 'Austin,TX',
): Promise<AutocompleteResponse> {
  return api('/api/v1/places/autocomplete', {
    query: { q, near },
  })
}

// ─── Spot search ──────────────────────────────────────────────────────────────

export interface SearchSpotsParams {
  q?: string
  category?: string
  limit?: number
  cursor?: string
}

export interface SearchSpotsResponse {
  spots: Spot[]
  nextCursor?: string
  total?: number
}

export async function searchSpots(
  params: SearchSpotsParams,
): Promise<SearchSpotsResponse> {
  const query: Record<string, string> = {}
  if (params.q !== undefined) query['q'] = params.q
  if (params.category !== undefined) query['category'] = params.category
  if (params.limit !== undefined) query['limit'] = String(params.limit)
  if (params.cursor !== undefined) query['cursor'] = params.cursor

  return api('/api/v1/spots', { query })
}
