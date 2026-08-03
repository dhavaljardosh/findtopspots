import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSpots } from '@/lib/api'
import { SpotCard } from '@/components/spots/SpotCard'
import { SpotCardSkeleton } from '@/components/layout/SpotCardSkeleton'

async function RecentSpots() {
  const { spots } = await getSpots({ limit: 12 })

  if (spots.length === 0) {
    return (
      <p className="text-center text-gray-500 py-12">
        No spots yet. Be the first to add one!
      </p>
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

function SpotGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <SpotCardSkeleton key={i} />
      ))}
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="py-16 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Discover Top Spots
        </h1>
        <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
          Find and share the best restaurants, cafes, parks, and hidden gems in
          your city.
        </p>

        <form
          className="mt-8 flex max-w-xl mx-auto gap-3"
          action="/spots"
          method="GET"
        >
          <input
            type="text"
            name="q"
            placeholder="Search spots, categories, or addresses..."
            className="flex-1 rounded-xl border border-gray-300 bg-white px-5 py-3 text-base shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Search
          </button>
        </form>
      </section>

      {/* Recent Spots Section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Recently Added
        </h2>
        <Suspense fallback={<SpotGridSkeleton />}>
          <RecentSpots />
        </Suspense>
      </section>
    </div>
  )
}
