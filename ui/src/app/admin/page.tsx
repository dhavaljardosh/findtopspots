import { auth } from '@clerk/nextjs/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function getAdminStats(token: string) {
  const res = await fetch(`${API_URL}/api/v1/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json() as Promise<{ totalSpots: number; totalUsers: number; pendingClaims: number }>
}

export default async function AdminPage() {
  const { getToken } = await auth()
  const token = await getToken()
  const stats = token ? await getAdminStats(token) : null

  if (!stats) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6">
        <p className="text-red-700 font-medium">Access denied — you need admin privileges.</p>
        <p className="text-sm text-red-600 mt-1">Ask an existing admin to run: POST /api/v1/admin/make-admin with your clerkId</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Spots', value: stats.totalSpots, color: 'blue' },
          { label: 'Total Users', value: stats.totalUsers, color: 'green' },
          { label: 'Pending Claims', value: stats.pendingClaims, color: 'amber' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className={`text-3xl font-bold mt-1 text-${color}-600`}>{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="flex gap-3">
          <a href="/admin/spots" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Review Spots</a>
          <a href="/admin/claims" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors">Review Claims</a>
        </div>
      </div>
    </div>
  )
}
