import { getSpots } from '@/lib/api'
import { SpotCard } from '@/components/spots/SpotCard'
import { SpotCardSkeleton } from '@/components/layout/SpotCardSkeleton'
import { Suspense } from 'react'
import type { SpotCategory } from '@fts/types'

const CATEGORIES: { label: string; value: SpotCategory | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Cafe', value: 'cafe' },
  { label: 'Bar', value: 'bar' },
  { label: 'Park', value: 'park' },
  { label: 'Gym', value: 'gym' },
  { label: 'Shop', value: 'shop' },
  { label: 'Attraction', value: 'attraction' },
  { label: 'Other', value: 'other' },
]

interface SearchParams {
  q?: string
  category?: string
  lat?: string
  lng?: string
}

async function SpotResults({ searchParams }: { searchParams: SearchParams }) {
  const { spots } = await getSpots({
    q: searchParams.q,
    category: searchParams.category as SpotCategory | undefined,
    lat: searchParams.lat !== undefined ? Number(searchParams.lat) : undefined,
    lng: searchParams.lng !== undefined ? Number(searchParams.lng) : undefined,
    limit: 20,
  })

  if (spots.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-lg">
          No spots found. Try adjusting your search.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {spots.map((spot) => (
        <SpotCard key={spot.id} spot={spot} />
      ))}
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <SpotCardSkeleton key={i} />
      ))}
    </div>
  )
}

export default async function SpotsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Browse Spots</h1>
        {params.q && (
          <p className="mt-1 text-gray-500">
            Search results for <span className="font-medium text-gray-700">&quot;{params.q}&quot;</span>
          </p>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search input */}
        <form action="/spots" method="GET" className="flex gap-2 flex-1">
          {params.category && (
            <input type="hidden" name="category" value={params.category} />
          )}
          <input
            type="text"
            name="q"
            defaultValue={params.q}
            placeholder="Search spots..."
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(({ label, value }) => {
            const isActive = (params.category ?? '') === value
            const href = value
              ? `/spots?${params.q ? `q=${params.q}&` : ''}category=${value}`
              : `/spots${params.q ? `?q=${params.q}` : ''}`

            return (
              <a
                key={value}
                href={href}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </a>
            )
          })}
        </div>
      </div>

      {/* Results */}
      <Suspense fallback={<SkeletonGrid />}>
        <SpotResults searchParams={params} />
      </Suspense>
    </div>
  )
}
