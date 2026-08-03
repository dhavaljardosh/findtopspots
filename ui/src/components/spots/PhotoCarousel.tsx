'use client'

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhotoCarouselProps {
  photos: string[]
  alt: string
  className?: string
  imgClassName?: string
  /** compact = smaller arrows/dots for cards; full = detail page */
  variant?: 'compact' | 'full'
}

export function PhotoCarousel({
  photos,
  alt,
  className,
  imgClassName,
  variant = 'full',
}: PhotoCarouselProps) {
  const [index, setIndex] = useState(0)

  const prev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setIndex((i) => (i - 1 + photos.length) % photos.length)
    },
    [photos.length],
  )

  const next = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setIndex((i) => (i + 1) % photos.length)
    },
    [photos.length],
  )

  if (photos.length === 0) return null

  const isCompact = variant === 'compact'

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <img
        key={photos[index]}
        src={photos[index]}
        alt={`${alt} — photo ${index + 1}`}
        className={cn('h-full w-full object-cover', imgClassName)}
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />

      {photos.length > 1 && (
        <>
          {/* Prev arrow */}
          <button
            type="button"
            onClick={prev}
            aria-label="Previous photo"
            className={cn(
              'absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 focus:outline-none',
              isCompact ? 'p-0.5' : 'p-1.5',
            )}
          >
            <ChevronLeft className={cn(isCompact ? 'h-4 w-4' : 'h-5 w-5')} />
          </button>

          {/* Next arrow */}
          <button
            type="button"
            onClick={next}
            aria-label="Next photo"
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 focus:outline-none',
              isCompact ? 'p-0.5' : 'p-1.5',
            )}
          >
            <ChevronRight className={cn(isCompact ? 'h-4 w-4' : 'h-5 w-5')} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setIndex(i) }}
                aria-label={`Go to photo ${i + 1}`}
                className={cn(
                  'rounded-full transition-all',
                  isCompact ? 'h-1.5 w-1.5' : 'h-2 w-2',
                  i === index ? 'bg-white' : 'bg-white/50',
                )}
              />
            ))}
          </div>

          {/* Counter badge (full variant only) */}
          {!isCompact && (
            <span className="absolute top-3 right-3 rounded-full bg-black/40 px-2.5 py-0.5 text-xs text-white backdrop-blur-sm">
              {index + 1} / {photos.length}
            </span>
          )}
        </>
      )}
    </div>
  )
}
