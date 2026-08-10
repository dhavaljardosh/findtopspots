'use client'

import { useRouter } from 'next/navigation'
import { Eye, MapPin, Star } from 'lucide-react'

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}
import type { Spot } from '@fts/types'
import { PhotoCarousel } from './PhotoCarousel'
import { VoteButton } from './VoteButton'
import { cn } from '@/lib/utils'
import { getTagDef, getTagStyle } from '@/lib/tags'
import { EmojiIcon } from '@/components/ui/EmojiIcon'

interface SpotCardProps {
  spot: Spot
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  restaurant: { bg: 'bg-rose-500/10 dark:bg-rose-500/15',   text: 'text-rose-600 dark:text-rose-400',   label: 'Restaurant' },
  cafe:        { bg: 'bg-amber-500/10 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400', label: 'Cafe' },
  bar:         { bg: 'bg-violet-500/10 dark:bg-violet-500/15', text: 'text-violet-600 dark:text-violet-400', label: 'Bar' },
  park:        { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400', label: 'Park' },
  gym:         { bg: 'bg-blue-500/10 dark:bg-blue-500/15',   text: 'text-blue-600 dark:text-blue-400',   label: 'Gym' },
  shop:        { bg: 'bg-pink-500/10 dark:bg-pink-500/15',   text: 'text-pink-600 dark:text-pink-400',   label: 'Shop' },
  attraction:  { bg: 'bg-orange-500/10 dark:bg-orange-500/15', text: 'text-orange-600 dark:text-orange-400', label: 'Attraction' },
  other:       { bg: 'bg-neutral-500/10 dark:bg-neutral-500/15', text: 'text-neutral-600 dark:text-neutral-400', label: 'Other' },
}

export function SpotCard({ spot }: SpotCardProps) {
  const router = useRouter()
  const cat = CATEGORY_STYLES[spot.category] ?? CATEGORY_STYLES.other!

  const allPhotos = [
    ...(spot.coverPhotoUrl ? [spot.coverPhotoUrl] : []),
    ...(spot.photos?.map((p) => p.url).filter((u) => u !== spot.coverPhotoUrl) ?? []),
  ]

  const rating = spot.avgRating ?? 0
  const hasRating = rating > 0

  return (
    <article
      data-testid="spot-card"
      onClick={() => router.push(`/spots/${spot.id}`)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-[var(--shadow-sm)] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] hover:border-[var(--color-border-strong)]"
    >
      {/* Photo area */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--color-surface-3)]">
        {allPhotos.length > 0 ? (
          <PhotoCarousel
            photos={allPhotos}
            alt={spot.name}
            variant="compact"
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <MapPin className="h-10 w-10 text-[var(--color-text-muted)] opacity-30" />
          </div>
        )}

        {/* Category pill — overlays photo */}
        <div className="absolute left-3 top-3">
          <span className={cn(
            'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm',
            cat.bg, cat.text,
          )}>
            {cat.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Name */}
        <h3 data-testid="spot-card-name" className="text-sm font-semibold leading-snug text-[var(--color-text-primary)] line-clamp-1 group-hover:text-amber-500 transition-colors">
          {spot.name}
        </h3>

        {/* Address */}
        <a
          href={`https://www.google.com/maps?q=${spot.lat},${spot.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors line-clamp-1"
        >
          <MapPin className="h-3 w-3 shrink-0" />
          {spot.address}
        </a>

        {/* Tags */}
        {spot.tags && spot.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {spot.tags.slice(0, 4).map((tag) => {
              const def = getTagDef(tag)
              const style = getTagStyle(tag)
              return (
                <span key={tag} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', style.bg, style.text)}>
                  {def?.emoji && <EmojiIcon emoji={def.emoji} size={11} />}
                  {def?.label ?? tag}
                </span>
              )
            })}
          </div>
        )}

        {/* Stats + vote */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {hasRating && (
              <span className="flex items-center gap-1 shrink-0">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold text-[var(--color-text-primary)]">{rating.toFixed(1)}</span>
              </span>
            )}
            {(spot.viewCount ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] shrink-0">
                <Eye className="h-3 w-3" />
                {fmtCount(spot.viewCount ?? 0)}
              </span>
            )}
          </div>
          <VoteButton spotId={spot.id} initialCount={spot.voteCount ?? 0} size="sm" />
        </div>
      </div>
    </article>
  )
}
