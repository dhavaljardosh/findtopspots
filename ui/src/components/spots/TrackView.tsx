'use client'
import { useEffect } from 'react'
import { trackSpotView } from '@/components/home/RecentlySeen'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const SESSION_KEY = 'fts:sid'

function getOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
    return id
  } catch {
    return 'anon'
  }
}

interface TrackViewProps {
  id: string
  name: string
  coverPhotoUrl: string | null
  category: string
  avgRating: number
  address: string
}

export function TrackView({ id, name, coverPhotoUrl, category, avgRating, address }: TrackViewProps) {
  useEffect(() => {
    const sid = getOrCreateSessionId()

    // Record in localStorage for RecentlySeen
    trackSpotView({ id, name, coverPhotoUrl, category, avgRating, address })

    // Lightweight unique daily view tracking (fire-and-forget)
    fetch(`${API_URL}/api/v1/spots/${id}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sid }),
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return null
}
