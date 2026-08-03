'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { EmojiIcon } from '@/components/ui/EmojiIcon'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'fts:recently_seen'
const MAX_ITEMS = 10

export interface SeenSpot {
  id: string
  name: string
  coverPhotoUrl: string | null
  category: string
  avgRating: number
  address: string
  seenAt: number
}

export function trackSpotView(spot: Omit<SeenSpot, 'seenAt'>) {
  try {
    const existing: SeenSpot[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    const filtered = existing.filter((s) => s.id !== spot.id)
    const updated = [{ ...spot, seenAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // ignore storage errors
  }
}

const CATEGORY_EMOJI: Record<string, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  bar: '🍺',
  park: '🌳',
  gym: '💪',
  shop: '🛍️',
  attraction: '🎭',
  other: '📍',
}

export function RecentlySeen() {
  const [spots, setSpots] = useState<SeenSpot[]>([])

  useEffect(() => {
    try {
      const stored: SeenSpot[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
      setSpots(stored.slice(0, MAX_ITEMS))
    } catch {
      setSpots([])
    }
  }, [])

  if (spots.length === 0) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Recently Viewed</h2>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">Pick up where you left off</p>
        </div>
        <button
          onClick={() => { localStorage.removeItem(STORAGE_KEY); setSpots([]) }}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {spots.map((spot) => (
          <Link
            key={spot.id}
            href={`/spots/${spot.id}`}
            className="group flex-shrink-0 w-44 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] overflow-hidden hover:border-amber-400/50 transition-all shadow-[var(--shadow-sm)]"
          >
            {spot.coverPhotoUrl ? (
              <div className="h-28 w-full overflow-hidden bg-[var(--color-surface-2)]">
                <img
                  src={spot.coverPhotoUrl}
                  alt={spot.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ) : (
              <div className="h-28 w-full bg-[var(--color-surface-2)] flex items-center justify-center">
                <EmojiIcon emoji={CATEGORY_EMOJI[spot.category] ?? '📍'} size={36} />
              </div>
            )}
            <div className="p-3 space-y-0.5">
              <p className="text-xs font-semibold text-[var(--color-text-primary)] line-clamp-2 leading-snug">{spot.name}</p>
              <p className="text-[10px] text-[var(--color-text-muted)] truncate">{spot.address.split(',').slice(0, 2).join(',')}</p>
              <div className="flex items-center gap-1 pt-0.5">
                <span className="text-[10px] text-amber-500">★ {spot.avgRating.toFixed(1)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
