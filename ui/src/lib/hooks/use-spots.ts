import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import type { SpotQuery, CreateSpot, CreateReview } from '@fts/types'
import {
  getSpots,
  getSpot,
  getSpotReviews,
  createSpot,
  createReview,
} from '@/lib/api'

export const spotKeys = {
  all: ['spots'] as const,
  lists: () => [...spotKeys.all, 'list'] as const,
  list: (query: SpotQuery) => [...spotKeys.lists(), query] as const,
  details: () => [...spotKeys.all, 'detail'] as const,
  detail: (id: string) => [...spotKeys.details(), id] as const,
  reviews: (spotId: string) => [...spotKeys.detail(spotId), 'reviews'] as const,
}

export function useSpots(query: SpotQuery) {
  return useQuery({
    queryKey: spotKeys.list(query),
    queryFn: () => getSpots(query),
  })
}

export function useSpot(id: string) {
  return useQuery({
    queryKey: spotKeys.detail(id),
    queryFn: () => getSpot(id),
    enabled: Boolean(id),
  })
}

export function useSpotReviews(spotId: string) {
  return useQuery({
    queryKey: spotKeys.reviews(spotId),
    queryFn: () => getSpotReviews(spotId),
    enabled: Boolean(spotId),
  })
}

export function useCreateSpot(token?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSpot) => createSpot(data, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: spotKeys.lists() })
    },
  })
}

export function useCreateReview(spotId: string, token?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateReview) => createReview(spotId, data, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: spotKeys.detail(spotId) })
      void queryClient.invalidateQueries({ queryKey: spotKeys.reviews(spotId) })
    },
  })
}
