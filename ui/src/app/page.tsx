import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowRight, Eye, MapPin } from 'lucide-react'

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}
import { getSpots } from '@/lib/api'
import type { Spot } from '@fts/types'
import { SpotCard } from '@/components/spots/SpotCard'
import { SpotCardSkeleton } from '@/components/layout/SpotCardSkeleton'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { RecentlySeen } from '@/components/home/RecentlySeen'
import { TopByCategory } from '@/components/home/TopByCategory'
import { VoteButton } from '@/components/spots/VoteButton'
import { EmojiIcon } from '@/components/ui/EmojiIcon'

const QUICK_CATS = [
  { emoji: '🍽️', label: 'Restaurants', cat: 'restaurant' },
  { emoji: '☕', label: 'Cafes',        cat: 'cafe' },
  { emoji: '🍺', label: 'Bars',         cat: 'bar' },
  { emoji: '🌳', label: 'Parks',        cat: 'park' },
  { emoji: '💪', label: 'Gyms',         cat: 'gym' },
  { emoji: '🛍️', label: 'Shopping',    cat: 'shop' },
  { emoji: '🎭', label: 'Attractions',  cat: 'attraction' },
]

type SpotWithPhotos = Spot & { photos?: { id: string; url: string }[] }

function VoteCard({ spot }: { spot: SpotWithPhotos }) {
  const photo = spot.coverPhotoUrl ?? spot.photos?.[0]?.url ?? null
  return (
    <Link
      href={`/spots/${spot.id}`}
      className="group relative flex-shrink-0 w-60 rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-1)] hover:border-amber-400/50 hover:shadow-[var(--shadow-md)] transition-all duration-200"
    >
      <div className="relative h-36 w-full overflow-hidden bg-[var(--color-surface-2)]">
        {photo ? (
          <img src={photo} alt={spot.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <MapPin className="h-8 w-8 text-[var(--color-text-muted)] opacity-20" />
          </div>
        )}
        {/* Stats overlay — top-right on photo */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          {(spot.viewCount ?? 0) > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 backdrop-blur-sm">
              <Eye className="h-3 w-3 text-white/80" />
              <span className="text-[11px] font-semibold text-white/90">{fmtCount(spot.viewCount ?? 0)}</span>
            </div>
          )}
          {(spot.voteCount ?? 0) > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-sm">
              <img src="https://openmoji.org/data/color/svg/1F525.svg" alt="🔥" width={13} height={13} />
              <span className="text-xs font-bold text-white">{spot.voteCount}</span>
            </div>
          )}
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        <p className="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-1 group-hover:text-amber-500 transition-colors">{spot.name}</p>
        <p className="text-[11px] text-[var(--color-text-muted)] truncate">{spot.address.split(',').slice(0, 2).join(',')}</p>
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-2">
            {spot.avgRating > 0 && (
              <span className="text-[11px] text-[var(--color-text-muted)]">★ {spot.avgRating.toFixed(1)}</span>
            )}
            {(spot.viewCount ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-[var(--color-text-muted)]">
                <Eye className="h-3 w-3" />
                {fmtCount(spot.viewCount ?? 0)}
              </span>
            )}
          </div>
          <VoteButton spotId={spot.id} initialCount={spot.voteCount ?? 0} size="sm" />
        </div>
      </div>
    </Link>
  )
}

async function HotRightNow() {
  const { spots } = await getSpots({ limit: 10, sort: 'top' })
  const hot = spots.filter((s) => (s.voteCount ?? 0) > 0)
  if (hot.length === 0) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-[var(--color-text-primary)]">
            <img src="https://openmoji.org/data/color/svg/1F525.svg" alt="🔥" width={22} height={22} />
            Hot Right Now
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">Most upvoted by the community</p>
        </div>
        <Link href="/spots" className="flex items-center gap-1 text-sm font-semibold text-amber-500 hover:text-amber-400 transition-colors">
          See all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {hot.map((spot) => <VoteCard key={spot.id} spot={spot as SpotWithPhotos} />)}
      </div>
    </section>
  )
}

async function JustAdded() {
  const { spots } = await getSpots({ limit: 8, sort: 'new' })
  if (spots.length === 0) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-[var(--color-text-primary)]">
            <img src="https://openmoji.org/data/color/svg/1F195.svg" alt="🆕" width={22} height={22} />
            Just Added
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">Freshly submitted by the community</p>
        </div>
        <Link href="/spots" className="flex items-center gap-1 text-sm font-semibold text-amber-500 hover:text-amber-400 transition-colors">
          Browse <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {spots.map((spot) => <VoteCard key={spot.id} spot={spot as SpotWithPhotos} />)}
      </div>
    </section>
  )
}

function HorizontalSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden pb-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-60 h-52 animate-pulse rounded-2xl bg-[var(--color-surface-2)]" />
      ))}
    </div>
  )
}

async function TopSpots() {
  const { spots } = await getSpots({ limit: 12 })
  if (spots.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
        No spots yet — be the first to add one!
      </p>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {spots.map((spot) => <SpotCard key={spot.id} spot={spot} />)}
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="space-y-14">
      {/* ── Hero ── */}
      <section className="relative overflow-visible rounded-3xl bg-[var(--color-surface-1)] border border-[var(--color-border)] px-6 py-12 text-center sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Community-powered discovery
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-5xl">
            Find the places<br />
            <span className="text-amber-500">worth going to</span>
          </h1>

          <div className="mx-auto mt-6 max-w-lg">
            <GlobalSearch variant="hero" defaultCity="Austin,TX" />
          </div>

          {/* Category quick-links */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {QUICK_CATS.map(({ emoji, label, cat }) => (
              <Link
                key={cat}
                href={`/spots?category=${cat}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:border-amber-400/50 hover:bg-amber-400/5 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                <EmojiIcon emoji={emoji} size={15} />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hot Right Now ── */}
      <Suspense fallback={<div className="space-y-4"><div className="h-7 w-40 animate-pulse rounded bg-[var(--color-surface-2)]" /><HorizontalSkeleton /></div>}>
        <HotRightNow />
      </Suspense>

      {/* ── Just Added ── */}
      <Suspense fallback={<div className="space-y-4"><div className="h-7 w-32 animate-pulse rounded bg-[var(--color-surface-2)]" /><HorizontalSkeleton /></div>}>
        <JustAdded />
      </Suspense>

      {/* ── Recently Viewed ── client-side localStorage */}
      <RecentlySeen />

      {/* ── Top by Category ── */}
      <Suspense fallback={<div className="space-y-10">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-[var(--color-surface-2)]" />)}</div>}>
        <TopByCategory />
      </Suspense>

      {/* ── All Top Spots grid ── */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">All Top Spots</h2>
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">Highest rated across Texas</p>
          </div>
          <Link href="/spots" className="flex items-center gap-1 text-sm font-semibold text-amber-500 hover:text-amber-400 transition-colors">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <Suspense fallback={
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <SpotCardSkeleton key={i} />)}
          </div>
        }>
          <TopSpots />
        </Suspense>
      </section>
    </div>
  )
}
