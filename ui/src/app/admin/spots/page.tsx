'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import type { Spot } from '@fts/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function AdminSpotsPage() {
  const { getToken } = useAuth()
  const [spots, setSpots] = useState<Spot[]>([])
  const [status, setStatus] = useState<'pending' | 'live' | 'rejected'>('live')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    void loadSpots()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const loadSpots = async () => {
    setLoading(true)
    const token = await getToken()
    const res = await fetch(`${API_URL}/api/v1/admin/spots?status=${status}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json() as { spots: Spot[] }
    setSpots(data.spots ?? [])
    setLoading(false)
  }

  const updateStatus = async (spotId: string, newStatus: string) => {
    setActionLoading(spotId)
    const token = await getToken()
    const res = await fetch(`${API_URL}/api/v1/admin/spots/${spotId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setSpots((prev) => prev.filter((s) => s.id !== spotId))
      toast.success(newStatus === 'live' ? 'Spot approved and live!' : 'Spot rejected.')
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string }
      const msg = data.error ?? 'Failed to update spot status.'
      console.error('[AdminSpots] updateStatus failed:', msg)
      toast.error(msg)
    }
    setActionLoading(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(['live', 'pending', 'rejected'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${status === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      ) : spots.length === 0 ? (
        <p className="text-gray-500 py-12 text-center">No {status} spots.</p>
      ) : (
        <div className="space-y-3">
          {spots.map((spot) => (
            <div key={spot.id} className="flex items-start gap-4 rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
              {spot.coverPhotoUrl && (
                <img src={spot.coverPhotoUrl} alt={spot.name} className="h-16 w-16 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{spot.name}</p>
                <p className="text-sm text-gray-500 truncate">{spot.address}</p>
                <p className="text-xs text-gray-400 mt-1">{spot.category} · ⭐ {spot.avgRating.toFixed(1)} · {spot.reviewCount} reviews</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {status !== 'live' && (
                  <button
                    onClick={() => void updateStatus(spot.id, 'live')}
                    disabled={actionLoading === spot.id}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    Approve
                  </button>
                )}
                {status !== 'rejected' && (
                  <button
                    onClick={() => void updateStatus(spot.id, 'rejected')}
                    disabled={actionLoading === spot.id}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    Reject
                  </button>
                )}
                <a href={`/spots/${spot.id}`} target="_blank" rel="noreferrer" className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors">View</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
