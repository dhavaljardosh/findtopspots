'use client'
import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { getToken } = useAuth()
  const [role, setRole] = useState('owner')
  const [businessEmail, setBusinessEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const token = await getToken()
    const res = await fetch(`${API_URL}/api/v1/spots/${id}/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, businessEmail, verificationMethod: 'email' }),
    })
    if (res.ok) {
      setSent(true)
    } else {
      const data = await res.json() as { error?: string }
      const msg = data.error ?? 'Something went wrong. Please try again.'
      console.error('[ClaimPage] claim failed:', msg)
      toast.error(msg)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-16">
        <div className="text-5xl">📧</div>
        <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
        <p className="text-gray-600">We sent a verification code to <strong>{businessEmail}</strong>. Enter it below to complete your claim.</p>
        <a href={`/spots/${id}/claim/verify`} className="inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
          Enter verification code
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Claim this Business</h1>
        <p className="mt-2 text-gray-600">Verify ownership to respond to reviews, update your profile, and unlock business tools.</p>
      </div>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="marketing">Marketing</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business email</label>
          <input
            type="email"
            required
            value={businessEmail}
            onChange={(e) => setBusinessEmail(e.target.value)}
            placeholder="you@yourbusiness.com"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">Use your business domain email for faster verification.</p>
        </div>
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {loading ? 'Sending...' : 'Send verification email'}
        </button>
      </form>
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
        <h3 className="font-semibold text-amber-900 text-sm">What you get</h3>
        <ul className="mt-2 space-y-1 text-sm text-amber-800">
          <li>✓ Respond to reviews</li>
          <li>✓ Update business info</li>
          <li>✓ Verified business badge</li>
          <li>✓ Access to business analytics (Pro)</li>
        </ul>
      </div>
    </div>
  )
}
