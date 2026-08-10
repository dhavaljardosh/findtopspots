import { Suspense } from 'react'
import Link from 'next/link'
import { MapPin, SlidersHorizontal } from 'lucide-react'
import { getSpots } from '@/lib/api'
import { SpotCard } from '@/components/spots/SpotCard'
import { SpotCardSkeleton } from '@/components/layout/SpotCardSkeleton'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { NearMeButton } from '@/components/spots/NearMeButton'
import { PopularTags } from '@/components/spots/PopularTags'
import { cn } from '@/lib/utils'
import type { SpotCategory } from '@fts/types'

const CATEGORIES: { label: string; value: SpotCategory | '' }[] = [
  { label: 'All',         value: '' },
  { label: 'Restaurants', value: 'restaurant' },
  { label: 'Cafes',       value: 'cafe' },
  { label: 'Bars',        value: 'bar' },
  { label: 'Parks',       value: 'park' },
  { label: 'Gyms',        value: 'gym' },
  { label: 'Shopping',    value: 'shop' },
  { label: 'Attractions', value: 'attraction' },
]

const CITIES = [
  { label: 'All Cities',    value: '' },
  { label: 'Austin',        value: 'Austin' },
  { label: 'San Antonio',   value: 'San Antonio' },
  { label: 'Houston',       value: 'Houston' },
  { label: 'Dallas',        value: 'Dallas' },
  { label: 'Round Rock',    value: 'Round Rock' },
  { label: 'Cedar Park',    value: 'Cedar Park' },
  { label: 'Waco',          value: 'Waco' },
  { label: 'San Marcos',    value: 'San Marcos' },
]

const PAGE_SIZE = 60

interface SearchParams {
  q?: string
  category?: string
  city?: string
  tag?: string
  cursor?: string
  near?: string
}

async function SpotResults({ searchParams }: { searchParams: SearchParams }) {
  const { spots, nextCursor } = await getSpots({
    q: searchParams.q,
    category: searchParams.category as SpotCategory | undefined,
    city: searchParams.city,
    tag: searchParams.tag,
    cursor: searchParams.cursor,
    limit: PAGE_SIZE,
  })

  const hasMore = Boolean(nextCursor)

  if (spots.length === 0) {
    return (
      <div data-testid="empty-state" className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--color-surface-2)]">
          <MapPin className="h-8 w-8 text-[var(--color-text-muted)]" />
        </div>
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">No spots found</h3>
        <p className="mt-2 max-w-sm text-sm text-[var(--color-text-secondary)]">
          {searchParams.q
            ? `No spots match "${searchParams.q}". Try a different search.`
            : 'No spots match your filters. Try clearing one.'}
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/spots"
            className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] transition-colors"
          >
            Clear filters
          </Link>
          <Link
            href="/spots/new"
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-amber-950 hover:bg-amber-300 transition-colors"
          >
            Add a spot
          </Link>
        </div>
      </div>
    )
  }

  const nextParams = new URLSearchParams()
  if (searchParams.q) nextParams.set('q', searchParams.q)
  if (searchParams.category) nextParams.set('category', searchParams.category)
  if (searchParams.city) nextParams.set('city', searchParams.city)
  if (searchParams.tag) nextParams.set('tag', searchParams.tag)
  if (searchParams.near) nextParams.set('near', searchParams.near)
  if (nextCursor) nextParams.set('cursor', nextCursor)

  return (
    <div className="space-y-6">
      <p className="text-xs text-[var(--color-text-muted)]">
        <span className="font-semibold text-[var(--color-text-primary)]">{spots.length}</span>
        {hasMore ? '+' : ''} spot{spots.length !== 1 ? 's' : ''}
        {searchParams.city ? ` in ${searchParams.city}` : ''}
        {searchParams.tag ? ` tagged #${searchParams.tag}` : ''}
      </p>

      <div data-testid="spot-grid" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {spots.map((spot) => <SpotCard key={spot.id} spot={spot} />)}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Link
            href={`/spots?${nextParams.toString()}`}
            className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-8 py-3 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] transition-colors shadow-[var(--shadow-xs)]"
          >
            Load more
          </Link>
        </div>
      )}
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="space-y-4">
      <div className="h-3 w-24 rounded-full bg-[var(--color-surface-3)] animate-pulse" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => <SpotCardSkeleton key={i} />)}
      </div>
    </div>
  )
}

export default async function SpotsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)]">Explore</h1>
          {params.q && (
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
              Results for <span className="font-semibold">&quot;{params.q}&quot;</span>
            </p>
          )}
          {params.tag && (
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
              Tagged <span className="font-semibold">#{params.tag}</span>
            </p>
          )}
        </div>
        <SlidersHorizontal className="h-4 w-4 text-[var(--color-text-muted)]" />
      </div>

      {/* Search */}
      <GlobalSearch variant="navbar" defaultCity={params.near ?? 'Austin,TX'} />

      {/* City filter */}
      <div className="flex gap-2 items-center overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        <NearMeButton />
        {CITIES.map(({ label, value }) => {
          const isActive = (params.city ?? '') === value
          const np = new URLSearchParams()
          if (params.q) np.set('q', params.q)
          if (params.category) np.set('category', params.category)
          if (value) np.set('city', value)
          return (
            <Link
              key={value}
              href={`/spots${np.toString() ? `?${np.toString()}` : ''}`}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                isActive
                  ? 'bg-amber-400 text-amber-950 shadow-sm'
                  : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)]',
              )}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        {CATEGORIES.map(({ label, value }) => {
          const isActive = (params.category ?? '') === value
          const np = new URLSearchParams()
          if (params.q) np.set('q', params.q)
          if (params.city) np.set('city', params.city)
          if (value) np.set('category', value)
          return (
            <Link
              key={value}
              href={`/spots${np.toString() ? `?${np.toString()}` : ''}`}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                isActive
                  ? 'bg-[var(--color-text-primary)] text-[var(--color-background)]'
                  : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)]',
              )}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Tag filter */}
      <Suspense fallback={null}>
        <PopularTags
          activeTag={params.tag}
          currentParams={{ q: params.q, city: params.city, category: params.category }}
        />
      </Suspense>

      {/* Results */}
      <Suspense key={JSON.stringify(params)} fallback={<SkeletonGrid />}>
        <SpotResults searchParams={params} />
      </Suspense>
    </div>
  )
}
