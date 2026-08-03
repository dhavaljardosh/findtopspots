'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import type { Claim } from '@fts/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function AdminClaimsPage() {
  const { getToken } = useAuth()
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    void loadClaims()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadClaims = async () => {
    setLoading(true)
    const token = await getToken()
    const res = await fetch(`${API_URL}/api/v1/admin/claims`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json() as { claims: Claim[] }
    setClaims(data.claims ?? [])
    setLoading(false)
  }

  const updateStatus = async (claimId: string, newStatus: string) => {
    setActionLoading(claimId)
    const token = await getToken()
    await fetch(`${API_URL}/api/v1/admin/claims/${claimId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setClaims((prev) => prev.filter((c) => c.id !== claimId))
    setActionLoading(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Pending Business Claims</h2>
        <p className="text-sm text-gray-500 mt-1">Review and approve or reject business ownership claims.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      ) : claims.length === 0 ? (
        <p className="text-gray-500 py-12 text-center">No pending claims.</p>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => (
            <div key={claim.id} className="flex items-start gap-4 rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">Claim #{claim.id.slice(0, 8)}</p>
                <p className="text-sm text-gray-500">Spot ID: {claim.spotId}</p>
                <p className="text-sm text-gray-500">Email: {claim.businessEmail}</p>
                <p className="text-xs text-gray-400 mt-1 capitalize">Role: {claim.role} · Status: {claim.status}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => void updateStatus(claim.id, 'basic')}
                  disabled={actionLoading === claim.id}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Approve (Basic)
                </button>
                <button
                  onClick={() => void updateStatus(claim.id, 'verified')}
                  disabled={actionLoading === claim.id}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Approve (Verified)
                </button>
                <button
                  onClick={() => void updateStatus(claim.id, 'rejected')}
                  disabled={actionLoading === claim.id}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
