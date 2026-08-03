'use client'
import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function ClaimVerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { getToken } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const token = await getToken()
    const res = await fetch(`${API_URL}/api/v1/spots/${id}/claim/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    })
    if (res.ok) {
      setVerified(true)
    } else {
      const data = await res.json() as { error?: string }
      const msg = data.error ?? 'Invalid or expired code.'
      console.error('[ClaimVerify] verification failed:', msg)
      toast.error(msg)
    }
    setLoading(false)
  }

  if (verified) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-20">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Business verified!</h2>
        <p className="text-gray-600">
          Your business now shows a verified badge. You can respond to reviews and manage your listing.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => router.push(`/spots/${id}`)}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            View your listing
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Enter verification code</h1>
        <p className="mt-2 text-gray-600">
          We sent a 6-digit code to your business email. It expires in 30 minutes.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Verification code</label>
          <input
            type="text"
            inputMode="numeric"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Verifying...' : 'Verify code'}
        </button>
      </form>

      <div className="text-center">
        <p className="text-sm text-gray-500">
          Didn&apos;t receive it?{' '}
          <a
            href={`/spots/${id}/claim`}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Go back and resend
          </a>
        </p>
      </div>
    </div>
  )
}
