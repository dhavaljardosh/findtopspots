'use client'
import { useEffect, useState } from 'react'
import { Clock, Phone, Globe, DollarSign } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface LiveData {
  isOpenNow: boolean | null
  hours: string | null
  googleRating: number | null
  googleReviewCount: number | null
  priceLevel: string | null
  phone?: string | null
  website?: string | null
}

interface SpotLiveDataProps {
  spotId: string
  phone?: string | null
  website?: string | null
}

export function SpotLiveData({ spotId, phone = null, website = null }: SpotLiveDataProps) {
  const [data, setData] = useState<LiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/v1/spots/${spotId}/external`)
      .then((r) => r.json())
      .then((d) => { setData(d as LiveData); setLoading(false) })
      .catch(() => setLoading(false))
  }, [spotId])

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 shadow-[var(--shadow-sm)]">
        <div className="flex gap-3">
          <div className="h-5 w-16 animate-pulse rounded bg-[var(--color-surface-2)]" />
          <div className="h-5 w-24 animate-pulse rounded bg-[var(--color-surface-2)]" />
        </div>
      </div>
    )
  }

  const hasAny = data && (
    data.isOpenNow !== null ||
    data.hours ||
    data.priceLevel ||
    phone ||
    website
  )

  if (!hasAny) return null

  const dayHours = data?.hours ? data.hours.split(' | ') : []
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todayHours = dayHours.find((d) => d.startsWith(today))

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 shadow-[var(--shadow-sm)] space-y-3">
      {/* Open now + price row */}
      <div className="flex flex-wrap items-center gap-3">
        {data?.isOpenNow !== null && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              data.isOpenNow
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 text-red-600 dark:text-red-400'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${data.isOpenNow ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {data.isOpenNow ? 'Open now' : 'Closed'}
          </span>
        )}
        {data?.priceLevel && (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-text-secondary)]">
            <DollarSign className="h-3.5 w-3.5" />
            {data.priceLevel}
          </span>
        )}
        {data?.googleRating && (
          <span className="text-sm text-[var(--color-text-muted)]">
            ★ {data.googleRating.toFixed(1)} Google
            {data.googleReviewCount ? ` (${data.googleReviewCount.toLocaleString()})` : ''}
          </span>
        )}
      </div>

      {/* Today's hours */}
      {todayHours && (
        <div className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          <div>
            <span>{todayHours}</span>
            {dayHours.length > 1 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="ml-2 text-xs text-amber-500 hover:text-amber-400 transition-colors"
              >
                {expanded ? 'Less' : 'All hours'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expanded hours */}
      {expanded && dayHours.length > 1 && (
        <div className="ml-6 space-y-0.5">
          {dayHours.map((line) => (
            <p key={line} className={`text-xs ${line.startsWith(today) ? 'font-semibold text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>
              {line}
            </p>
          ))}
        </div>
      )}

      {/* Phone + website */}
      {(phone || website) && (
        <div className="flex flex-wrap gap-4">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-amber-500 transition-colors"
            >
              <Phone className="h-4 w-4" />
              {phone}
            </a>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-amber-500 transition-colors truncate max-w-xs"
            >
              <Globe className="h-4 w-4 shrink-0" />
              {website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
