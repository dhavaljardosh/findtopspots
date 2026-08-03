'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Navigation } from 'lucide-react'

export function NearMeButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = () => {
    if (!navigator.geolocation) return
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false)
        router.push(`/spots?lat=${pos.coords.latitude.toFixed(4)}&lng=${pos.coords.longitude.toFixed(4)}`)
      },
      () => setLoading(false),
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-60"
    >
      <Navigation className="h-3.5 w-3.5" />
      {loading ? 'Finding you...' : 'Near Me'}
    </button>
  )
}
