'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { Star, MessageSquare, CheckCircle, Clock, Building2 } from 'lucide-react'
import type { Spot } from '@fts/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Review {
  id: string
  spotId: string
  userId: string
  rating: number
  body: string
  createdAt: string
}

interface Claim {
  id: string
  spotId: string
  status: string
  role: string
  businessEmail: string
  verifiedAt: string | null
  createdAt: string
}

interface DashboardData {
  claims: Claim[]
  pendingClaims: Claim[]
  claimedSpots: Spot[]
  recentReviews: Review[]
}

export default function DashboardPage() {
  const { getToken, isSignedIn, isLoaded } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    void (async () => {
      const token = await getToken()
      const res = await fetch(`${API_URL}/api/v1/users/me/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json() as DashboardData
        setData(json)
      }
      setLoading(false)
    })()
  }, [isLoaded, isSignedIn, getToken])

  const submitResponse = async (reviewId: string) => {
    if (!responseText.trim()) return
    setSubmitting(true)
    const token = await getToken()
    await fetch(`${API_URL}/api/v1/reviews/${reviewId}/respond`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: responseText.trim() }),
    })
    setRespondingTo(null)
    setResponseText('')
    setSubmitting(false)
  }

  if (!isLoaded || loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600">Sign in to view your business dashboard.</p>
        <Link href="/sign-in" className="mt-4 inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
          Sign in
        </Link>
      </div>
    )
  }

  const spotMap = Object.fromEntries((data?.claimedSpots ?? []).map((s) => [s.id, s]))

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Business Dashboard</h1>
        <p className="mt-1 text-gray-500">Manage your claimed spots and respond to reviews.</p>
      </div>

      {/* Pending claims */}
      {data?.pendingClaims && data.pendingClaims.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-600" />
            <h2 className="font-semibold text-amber-900">Pending verification</h2>
          </div>
          <div className="space-y-2">
            {data.pendingClaims.map((cl) => (
              <div key={cl.id} className="flex items-center justify-between">
                <span className="text-sm text-amber-800">
                  {spotMap[cl.spotId]?.name ?? cl.spotId} — {cl.businessEmail}
                </span>
                <Link
                  href={`/spots/${cl.spotId}/claim/verify`}
                  className="text-sm font-medium text-amber-700 hover:text-amber-900 underline"
                >
                  Enter code
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No claims yet */}
      {(!data?.claims || data.claims.length === 0) && (!data?.pendingClaims || data.pendingClaims.length === 0) && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No verified businesses yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Find your business on FindTopSpots and claim it to access owner tools.
          </p>
          <Link
            href="/spots"
            className="mt-4 inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Browse spots
          </Link>
        </div>
      )}

      {/* Claimed spots */}
      {data?.claimedSpots && data.claimedSpots.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your businesses</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.claimedSpots.map((spot) => {
              const claim = data.claims.find((cl) => cl.spotId === spot.id)
              return (
                <Link
                  key={spot.id}
                  href={`/spots/${spot.id}`}
                  className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  {spot.coverPhotoUrl ? (
                    <img
                      src={spot.coverPhotoUrl}
                      alt={spot.name}
                      className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center">
                      <Building2 className="h-7 w-7 text-gray-300" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-gray-900 truncate">{spot.name}</p>
                      <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">{spot.category}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600">
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {spot.avgRating.toFixed(1)}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MessageSquare className="h-3 w-3" />
                        {spot.reviewCount} review{spot.reviewCount !== 1 ? 's' : ''}
                      </span>
                      {claim && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700 capitalize">
                          {claim.status}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent reviews */}
      {data?.recentReviews && data.recentReviews.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent reviews</h2>
          <div className="space-y-4">
            {data.recentReviews.map((review) => {
              const spot = spotMap[review.spotId]
              const isResponding = respondingTo === review.id
              return (
                <div key={review.id} className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                            />
                          ))}
                        </div>
                        {spot && (
                          <Link
                            href={`/spots/${spot.id}`}
                            className="text-xs text-blue-600 hover:underline font-medium"
                          >
                            {spot.name}
                          </Link>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{review.body}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(review.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    {!isResponding && (
                      <button
                        onClick={() => setRespondingTo(review.id)}
                        className="flex-shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Respond
                      </button>
                    )}
                  </div>

                  {isResponding && (
                    <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                      <label className="block text-xs font-medium text-gray-700">
                        Your response (visible on the listing)
                      </label>
                      <textarea
                        rows={3}
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Thank you for your feedback..."
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => void submitResponse(review.id)}
                          disabled={submitting || !responseText.trim()}
                          className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                        >
                          {submitting ? 'Posting...' : 'Post response'}
                        </button>
                        <button
                          onClick={() => { setRespondingTo(null); setResponseText('') }}
                          className="rounded-lg border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
