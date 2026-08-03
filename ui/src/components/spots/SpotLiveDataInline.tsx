'use client'
import { useEffect, useState } from 'react'
import { Clock, Phone, Globe, ChevronDown, ChevronUp } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface LiveData {
  isOpenNow: boolean | null
  hours: string | null
  googleRating: number | null
  googleReviewCount: number | null
  priceLevel: string | null
}

export function SpotLiveDataInline({ spotId }: { spotId: string }) {
  const [data, setData] = useState<LiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoursOpen, setHoursOpen] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/v1/spots/${spotId}/external`)
      .then((r) => r.json())
      .then((d) => { setData(d as LiveData); setLoading(false) })
      .catch(() => setLoading(false))
  }, [spotId])

  if (loading) {
    return (
      <div className="flex gap-3 border-b border-[var(--color-border)] py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-6 w-20 animate-pulse rounded-full bg-[var(--color-surface-2)]" />
        ))}
      </div>
    )
  }

  const hasAny = data && (data.isOpenNow !== null || data.hours || data.priceLevel || data.googleRating)
  if (!hasAny) return null

  const dayHours = data?.hours ? data.hours.split(' | ') : []
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todayHours = dayHours.find((d) => d.startsWith(today))

  return (
    <div className="border-b border-[var(--color-border)] py-4 space-y-3">
      {/* Status row */}
      <div className="flex flex-wrap items-center gap-3">
        {data?.isOpenNow !== null && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            data.isOpenNow
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 text-red-600 dark:text-red-400'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${data.isOpenNow ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {data.isOpenNow ? 'Open now' : 'Closed'}
          </span>
        )}
        {data?.priceLevel && (
          <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
            {data.priceLevel}
          </span>
        )}
        {data?.googleRating && (
          <span className="text-sm text-[var(--color-text-muted)]">
            ★ {data.googleRating.toFixed(1)} on Google
            {data.googleReviewCount ? ` · ${data.googleReviewCount.toLocaleString()} reviews` : ''}
          </span>
        )}
      </div>

      {/* Today's hours + expand */}
      {todayHours && (
        <div>
          <button
            onClick={() => setHoursOpen((v) => !v)}
            className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <Clock className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
            <span>{todayHours}</span>
            {dayHours.length > 1 && (
              hoursOpen
                ? <ChevronUp className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                : <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
            )}
          </button>

          {hoursOpen && dayHours.length > 1 && (
            <div className="mt-2 ml-6 space-y-0.5">
              {dayHours.map((line) => (
                <p key={line} className={`text-xs ${line.startsWith(today) ? 'font-semibold text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
