import type { Metadata } from 'next'
import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { getSpot, getSpotReviews } from '@/lib/api'
import { StarRating } from '@/components/spots/StarRating'
import { ReviewCard } from '@/components/spots/ReviewCard'
import { AddReviewForm } from '@/components/spots/AddReviewForm'
import { formatRating, formatReviewCount } from '@/lib/utils'

export const experimental_ppr = true

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  try {
    const spot = await getSpot(id)
    return {
      title: `${spot.name} — FindTopSpots`,
      description: spot.description.slice(0, 155),
    }
  } catch {
    return {
      title: 'Spot — FindTopSpots',
    }
  }
}

async function SpotReviews({ spotId }: { spotId: string }) {
  const reviews = await getSpotReviews(spotId)

  if (reviews.length === 0) {
    return (
      <p className="text-gray-500 py-4">
        No reviews yet. Be the first to write one!
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  )
}

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  bar: 'Bar',
  park: 'Park',
  gym: 'Gym',
  shop: 'Shop',
  attraction: 'Attraction',
  other: 'Other',
}

const CATEGORY_COLORS: Record<string, string> = {
  restaurant: 'bg-red-100 text-red-700',
  cafe: 'bg-amber-100 text-amber-700',
  bar: 'bg-purple-100 text-purple-700',
  park: 'bg-green-100 text-green-700',
  gym: 'bg-blue-100 text-blue-700',
  shop: 'bg-pink-100 text-pink-700',
  attraction: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-700',
}

export default async function SpotDetailPage({ params }: Props) {
  const { id } = await params
  const { userId } = await auth()
  const spot = await getSpot(id)

  const isOwner = false // We'd need to compare userId with spot.createdBy via DB lookup
  const canReview = Boolean(userId) && !isOwner

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-4xl font-bold text-gray-900">{spot.name}</h1>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${CATEGORY_COLORS[spot.category] ?? 'bg-gray-100 text-gray-700'}`}
          >
            {CATEGORY_LABELS[spot.category] ?? spot.category}
          </span>
        </div>

        <p className="text-gray-500 text-sm flex items-center gap-1">
          <svg
            className="h-4 w-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
          </svg>
          {spot.address}
        </p>

        <div className="flex items-center gap-3">
          <StarRating rating={spot.avgRating} size="md" />
          <span className="text-lg font-semibold text-gray-900">
            {formatRating(spot.avgRating)}
          </span>
          <span className="text-gray-500 text-sm">
            {formatReviewCount(spot.reviewCount)}
          </span>
        </div>
      </div>

      {/* Description */}
      {spot.description && (
        <div className="prose prose-gray max-w-none">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">About</h2>
          <p className="text-gray-700 leading-relaxed">{spot.description}</p>
        </div>
      )}

      {/* Tags */}
      {spot.tags && spot.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {spot.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Reviews */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Reviews</h2>
        </div>

        {canReview && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Write a Review
            </h3>
            <AddReviewForm spotId={id} />
          </div>
        )}

        {!userId && (
          <p className="text-sm text-gray-500">
            <a href="/sign-in" className="text-blue-600 hover:underline">
              Sign in
            </a>{' '}
            to write a review.
          </p>
        )}

        <Suspense
          fallback={
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl bg-gray-100"
                />
              ))}
            </div>
          }
        >
          <SpotReviews spotId={id} />
        </Suspense>
      </section>
    </div>
  )
}
