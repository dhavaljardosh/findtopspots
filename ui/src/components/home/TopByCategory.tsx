import Link from 'next/link'
import { ArrowRight, MapPin } from 'lucide-react'
import type { Spot } from '@fts/types'
import { EmojiIcon } from '@/components/ui/EmojiIcon'
import { VoteButton } from '@/components/spots/VoteButton'
import { formatRating } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const CATEGORY_META: Record<string, { emoji: string; label: string; color: string }> = {
  restaurant: { emoji: '🍽️', label: 'Restaurants',  color: 'text-rose-600 dark:text-rose-400' },
  cafe:        { emoji: '☕',  label: 'Cafes',        color: 'text-amber-600 dark:text-amber-400' },
  bar:         { emoji: '🍺',  label: 'Bars',         color: 'text-violet-600 dark:text-violet-400' },
  park:        { emoji: '🌳',  label: 'Parks',        color: 'text-emerald-600 dark:text-emerald-400' },
  gym:         { emoji: '💪',  label: 'Gyms',         color: 'text-blue-600 dark:text-blue-400' },
  shop:        { emoji: '🛍️', label: 'Shopping',     color: 'text-pink-600 dark:text-pink-400' },
  attraction:  { emoji: '🎭',  label: 'Attractions',  color: 'text-orange-600 dark:text-orange-400' },
  other:       { emoji: '📍',  label: 'Other',        color: 'text-neutral-600 dark:text-neutral-400' },
}

const CAT_ORDER = ['restaurant', 'cafe', 'bar', 'park', 'gym', 'shop', 'attraction', 'other']

type SpotWithPhotos = Spot & { photos?: { id: string; url: string }[] }

interface TopByCategoryData {
  [category: string]: SpotWithPhotos[]
}

async function fetchTopByCategory(): Promise<TopByCategoryData> {
  try {
    const res = await fetch(`${API_URL}/api/v1/spots/top-by-category?limit=6`, {
      next: { revalidate: 300 }, // cache 5 min
    })
    if (!res.ok) return {}
    return res.json() as Promise<TopByCategoryData>
  } catch {
    return {}
  }
}

function SpotMiniCard({ spot }: { spot: SpotWithPhotos }) {
  const photo = spot.coverPhotoUrl ?? spot.photos?.[0]?.url ?? null

  return (
    <Link
      href={`/spots/${spot.id}`}
      className="group flex-shrink-0 w-52 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] overflow-hidden hover:border-amber-400/50 hover:shadow-[var(--shadow-md)] transition-all duration-200"
    >
      {/* Photo */}
      <div className="relative h-32 w-full overflow-hidden bg-[var(--color-surface-2)]">
        {photo ? (
          <img
            src={photo}
            alt={spot.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <MapPin className="h-8 w-8 text-[var(--color-text-muted)] opacity-30" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <p className="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-1 group-hover:text-amber-500 transition-colors">
          {spot.name}
        </p>
        <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-1">
          {spot.address.split(',').slice(0, 2).join(',')}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[var(--color-text-muted)]">
            ★ {formatRating(spot.avgRating)}
          </span>
          <VoteButton spotId={spot.id} initialCount={spot.voteCount ?? 0} size="sm" />
        </div>
      </div>
    </Link>
  )
}

export async function TopByCategory() {
  const data = await fetchTopByCategory()

  const categories = CAT_ORDER.filter((cat) => (data[cat]?.length ?? 0) > 0)
  if (categories.length === 0) return null

  return (
    <div className="space-y-10">
      {categories.map((cat) => {
        const spots = data[cat]!
        const meta = CATEGORY_META[cat] ?? CATEGORY_META.other!

        return (
          <section key={cat} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EmojiIcon emoji={meta.emoji} size={22} />
                <div>
                  <h2 className={`text-lg font-bold ${meta.color}`}>
                    🔥 Top {meta.label}
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)]">Most upvoted by community</p>
                </div>
              </div>
              <Link
                href={`/spots?category=${cat}`}
                className="flex items-center gap-1 text-sm font-semibold text-amber-500 hover:text-amber-400 transition-colors whitespace-nowrap"
              >
                See all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {spots.map((spot) => (
                <SpotMiniCard key={spot.id} spot={spot} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
