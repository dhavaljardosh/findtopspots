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
  if (query.lat !== undefined) params['lat'] = String(query.lat)
  if (query.lng !== undefined) params['lng'] = String(query.lng)
  if (query.radiusKm !== undefined) params['radiusKm'] = String(query.radiusKm)
  if (query.category !== undefined) params['category'] = query.category
  if (query.limit !== undefined) params['limit'] = String(query.limit)
  if (query.cursor !== undefined) params['cursor'] = query.cursor

  return api('/api/v1/spots', { query: params })
}

export async function getSpot(id: string): Promise<Spot> {
  return api(`/api/v1/spots/${id}`)
}

export async function createSpot(
  data: CreateSpot,
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
  return api(`/api/v1/spots/${spotId}/reviews`)
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
