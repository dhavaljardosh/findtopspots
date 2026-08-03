'use client'

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { Search, Star, MapPin, X } from 'lucide-react'
import { autocompletePlace } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { SpotCategory } from '@fts/types'

// ─── Local types matching the API response shape ─────────────────────────────

interface ExistingResult {
  type: 'existing'
  id: string
  name: string
  address: string
  category: string
  lat: number
  lng: number
  avgRating: number
  reviewCount: number
}

interface ExternalSuggestion {
  type: 'suggestion'
  foursquareId?: string
  googlePlaceId?: string
  name: string
  address: string
  category: string
  lat: number
  lng: number
}

interface AutocompleteResponse {
  existing: ExistingResult[]
  suggestions: ExternalSuggestion[]
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SelectedPlace {
  name: string
  address: string
  lat: number
  lng: number
  category: string
  foursquareId?: string
  googlePlaceId?: string
}

interface PlaceAutocompleteProps {
  onSelect: (place: SelectedPlace) => void
  defaultCity?: string
  placeholder?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function categoryLabel(cat: string) {
  return CATEGORY_LABELS[cat] ?? cat
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="h-4 w-4 rounded bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-3/5 rounded bg-gray-200" />
        <div className="h-2.5 w-4/5 rounded bg-gray-200" />
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PlaceAutocomplete({
  onSelect,
  defaultCity = 'Austin,TX',
  placeholder = 'Search for a place...',
}: PlaceAutocompleteProps) {
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AutocompleteResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Flatten all items for keyboard nav
  const allItems = results
    ? [
        ...results.existing.map((e) => ({ kind: 'existing' as const, data: e })),
        ...results.suggestions.map((s) => ({ kind: 'suggestion' as const, data: s })),
      ]
    : []

  const hasResults =
    results && (results.existing.length > 0 || results.suggestions.length > 0)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchResults = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults(null)
        setOpen(false)
        return
      }
      setLoading(true)
      setOpen(true)
      try {
        const data = await autocompletePlace(q, defaultCity)
        setResults(data as AutocompleteResponse)
      } catch {
        setResults({ existing: [], suggestions: [] })
      } finally {
        setLoading(false)
      }
    },
    [defaultCity],
  )

  const handleInputChange = (value: string) => {
    setQuery(value)
    setActiveIndex(-1)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void fetchResults(value)
    }, 300)
  }

  // ── Selection ──────────────────────────────────────────────────────────────

  const selectExisting = (item: ExistingResult) => {
    setOpen(false)
    setQuery(item.name)
    router.push(`/spots/${item.id}`)
  }

  const selectSuggestion = (item: ExternalSuggestion) => {
    setOpen(false)
    setQuery(item.name)
    const selected: SelectedPlace = {
      name: item.name,
      address: item.address,
      lat: item.lat,
      lng: item.lng,
      category: item.category,
    }
    if (item.foursquareId) selected.foursquareId = item.foursquareId
    if (item.googlePlaceId) selected.googlePlaceId = item.googlePlaceId
    onSelect(selected)
  }

  const selectByIndex = (index: number) => {
    if (!results) return
    const item = allItems[index]
    if (!item) return
    if (item.kind === 'existing') {
      selectExisting(item.data as ExistingResult)
    } else {
      selectSuggestion(item.data as ExternalSuggestion)
    }
  }

  // ── Keyboard navigation ────────────────────────────────────────────────────

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, allItems.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0) {
          selectByIndex(activeIndex)
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  // ── Click outside ──────────────────────────────────────────────────────────

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Cleanup debounce ───────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────

  let globalItemIndex = -1

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input */}
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results && query.length >= 2) setOpen(true)
          }}
          aria-autocomplete="list"
          aria-expanded={open}
          role="combobox"
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setResults(null)
              setOpen(false)
              inputRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 overflow-y-auto rounded-xl bg-white shadow-lg ring-1 ring-gray-200"
        >
          {loading ? (
            <div className="py-2">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : !hasResults ? (
            <div className="flex items-center gap-2 px-4 py-5 text-sm text-gray-500">
              <MapPin className="h-4 w-4 shrink-0" />
              No results — try a different search
            </div>
          ) : (
            <div className="py-1.5">
              {/* Existing spots section */}
              {results!.existing.length > 0 && (
                <section>
                  <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Already on FindTopSpots
                  </p>
                  {results!.existing.map((item) => {
                    globalItemIndex++
                    const idx = globalItemIndex
                    const isActive = activeIndex === idx

                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => selectExisting(item)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          'flex w-full items-start gap-3 border-l-2 border-blue-500 px-4 py-2.5 text-left transition-colors',
                          isActive ? 'bg-gray-50' : 'hover:bg-gray-50',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {item.name}
                          </p>
                          <p className="truncate text-xs text-gray-500">{item.address}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 pt-0.5">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-medium text-gray-700">
                            {item.avgRating.toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-400">
                            ({item.reviewCount})
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </section>
              )}

              {/* Divider between sections */}
              {results!.existing.length > 0 && results!.suggestions.length > 0 && (
                <div className="my-1.5 border-t border-gray-100" />
              )}

              {/* Google suggestions section */}
              {results!.suggestions.length > 0 && (
                <section>
                  <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Add new spot
                  </p>
                  {results!.suggestions.map((item) => {
                    globalItemIndex++
                    const idx = globalItemIndex
                    const isActive = activeIndex === idx

                    return (
                      <button
                        key={item.foursquareId ?? item.googlePlaceId ?? item.name}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => selectSuggestion(item)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          'flex w-full items-start gap-3 border-l-2 border-amber-400 px-4 py-2.5 text-left transition-colors',
                          isActive ? 'bg-gray-50' : 'hover:bg-gray-50',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {item.name}
                          </p>
                          <p className="truncate text-xs text-gray-500">{item.address}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {categoryLabel(item.category)}
                        </span>
                      </button>
                    )
                  })}
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
