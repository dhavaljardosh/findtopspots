'use client'

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
  FormEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { searchSpots } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Spot } from '@fts/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface GlobalSearchProps {
  variant: 'hero' | 'navbar'
  defaultCity?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SkeletonRow({ compact }: { compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3 px-4 animate-pulse', compact ? 'py-2' : 'py-3')}>
      <div className="h-3.5 w-3.5 rounded bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-2/5 rounded bg-gray-200" />
        <div className="h-2.5 w-3/5 rounded bg-gray-200" />
      </div>
      <div className="h-4 w-12 rounded-full bg-gray-200 shrink-0" />
    </div>
  )
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

// ─── Component ────────────────────────────────────────────────────────────────

export function GlobalSearch({ variant, defaultCity = 'Austin,TX' }: GlobalSearchProps) {
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Spot[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isHero = variant === 'hero'

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    setOpen(true)
    try {
      const data = await searchSpots({ q, limit: 5 })
      setResults(data.spots)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (value: string) => {
    setQuery(value)
    setActiveIndex(-1)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void fetchResults(value)
    }, 300)
  }

  // ── Navigation helpers ─────────────────────────────────────────────────────

  const navigateToSearch = (q: string) => {
    if (!q.trim()) return
    const params = new URLSearchParams({ q, near: defaultCity })
    router.push(`/spots?${params.toString()}`)
    setOpen(false)
  }

  const selectSpot = (spot: Spot) => {
    setOpen(false)
    setQuery(spot.name)
    router.push(`/spots/${spot.id}`)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (activeIndex >= 0 && results[activeIndex]) {
      selectSpot(results[activeIndex])
    } else {
      navigateToSearch(query)
    }
  }

  // ── Keyboard navigation ────────────────────────────────────────────────────

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // +1 for "See all results" row
    const totalItems = results.length + 1

    switch (e.key) {
      case 'ArrowDown':
        if (!open) return
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, totalItems - 1))
        break
      case 'ArrowUp':
        if (!open) return
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (!open) {
          navigateToSearch(query)
          return
        }
        if (activeIndex === results.length) {
          // "See all results" row
          navigateToSearch(query)
        } else if (activeIndex >= 0 && results[activeIndex]) {
          selectSpot(results[activeIndex])
        } else {
          navigateToSearch(query)
        }
        break
      case 'Escape':
        setOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  // ── Click outside ──────────────────────────────────────────────────────────

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className={cn('relative', isHero ? 'w-full max-w-2xl mx-auto' : 'w-full max-w-xs')}
    >
      <form onSubmit={handleSubmit} role="search">
        <div className="relative flex items-center">
          <Search
            className={cn(
              'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400',
              isHero ? 'h-5 w-5' : 'h-4 w-4',
            )}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (results.length > 0 && query.length >= 2) setOpen(true)
            }}
            placeholder={
              isHero
                ? 'Search restaurants, cafes, parks, shops...'
                : 'Search spots...'
            }
            aria-label="Search spots"
            aria-expanded={open}
            aria-autocomplete="list"
            role="combobox"
            className={cn(
              'w-full border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-colors',
              isHero
                ? 'rounded-full py-4 pl-12 pr-36 text-base shadow-sm'
                : 'rounded-full py-2 pl-9 pr-20 text-sm shadow-sm',
            )}
          />
          <button
            type="submit"
            className={cn(
              'absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-amber-400 font-semibold text-white hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 transition-colors',
              isHero ? 'px-6 py-2.5 text-sm' : 'px-3.5 py-1.5 text-xs',
            )}
          >
            Search
          </button>
        </div>
      </form>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className={cn(
            'absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-gray-200',
            isHero && 'backdrop-blur-sm',
          )}
        >
          {loading ? (
            <div className="py-1.5">
              <SkeletonRow compact={!isHero} />
              <SkeletonRow compact={!isHero} />
              <SkeletonRow compact={!isHero} />
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-4 text-sm text-gray-500">
              No spots found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="py-1.5">
              {results.map((spot, idx) => {
                const isActive = activeIndex === idx
                return (
                  <button
                    key={spot.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => selectSpot(spot)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 text-left transition-colors',
                      isHero ? 'py-3' : 'py-2',
                      isActive ? 'bg-gray-50' : 'hover:bg-gray-50',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {spot.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">{spot.address}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {spot.voteCount > 0 && (
                        <span className="text-xs font-semibold text-orange-500">
                          🔥 {spot.voteCount}
                        </span>
                      )}
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                          CATEGORY_COLORS[spot.category] ?? 'bg-gray-100 text-gray-700',
                        )}
                      >
                        {spot.category}
                      </span>
                    </div>
                  </button>
                )
              })}

              {/* See all results */}
              <div className="border-t border-gray-100 pt-1">
                <button
                  type="button"
                  role="option"
                  aria-selected={activeIndex === results.length}
                  onClick={() => navigateToSearch(query)}
                  onMouseEnter={() => setActiveIndex(results.length)}
                  className={cn(
                    'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-amber-600 transition-colors hover:bg-amber-50',
                    activeIndex === results.length && 'bg-amber-50',
                  )}
                >
                  <Search className="h-3.5 w-3.5" />
                  See all results for &ldquo;{query}&rdquo;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
