'use client'
import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { EmojiIcon } from '@/components/ui/EmojiIcon'
import { trackSpotVoted } from '@/lib/analytics'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface VoteButtonProps {
  spotId: string
  initialCount: number
  initialVoted?: boolean
  size?: 'sm' | 'md'
}

export function VoteButton({ spotId, initialCount, initialVoted = false, size = 'sm' }: VoteButtonProps) {
  const { isSignedIn, getToken } = useAuth()
  const [count, setCount] = useState(initialCount)
  const [voted, setVoted] = useState(initialVoted)
  const [loading, setLoading] = useState(false)

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isSignedIn) {
      window.location.href = '/sign-in'
      return
    }
    if (loading) return
    setLoading(true)
    const token = await getToken()
    const res = await fetch(`${API_URL}/api/v1/spots/${spotId}/vote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json() as { voted: boolean; voteCount: number }
      setVoted(data.voted)
      setCount(data.voteCount)
      trackSpotVoted(spotId, '', data.voted)
      if (data.voted) toast.success('🔥 Upvoted!')
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string }
      const msg = data.error ?? 'Failed to vote. Please try again.'
      console.error('[VoteButton] vote failed:', msg)
      toast.error(msg)
    }
    setLoading(false)
  }

  if (size === 'md') {
    return (
      <button
        data-testid="vote-button"
        onClick={(e) => void toggle(e)}
        disabled={loading}
        title={voted ? 'Remove vote' : 'Upvote this spot'}
        className={cn(
          'group relative flex items-center gap-2 rounded-2xl border-2 px-5 py-2.5 text-sm font-bold transition-all duration-200 select-none',
          voted
            ? 'border-orange-400 bg-gradient-to-br from-orange-400/20 to-amber-400/10 text-orange-500 shadow-[0_0_16px_rgba(251,146,60,0.3)]'
            : 'border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-text-secondary)] hover:border-orange-400/60 hover:bg-orange-400/5 hover:text-orange-500',
          loading && 'opacity-60 cursor-not-allowed',
        )}
      >
        <span className={cn('transition-transform duration-200', voted ? 'scale-110' : 'group-hover:scale-110')}>
          <EmojiIcon emoji="🔥" size={22} />
        </span>
        <span className={cn('tabular-nums', voted ? 'text-orange-500' : '')}>
          {count > 0 ? count.toLocaleString() : 'Upvote'}
        </span>
        {voted && (
          <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-400">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
        )}
      </button>
    )
  }

  // sm size (for cards)
  return (
    <button
      data-testid="vote-button"
      onClick={(e) => void toggle(e)}
      disabled={loading}
      title={voted ? 'Remove vote' : 'Upvote'}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-150 select-none',
        voted
          ? 'border-orange-300 bg-orange-50 text-orange-600 dark:bg-orange-400/10 dark:text-orange-400'
          : 'border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-text-muted)] hover:border-orange-300 hover:text-orange-500',
        loading && 'opacity-60 cursor-not-allowed',
      )}
    >
      <EmojiIcon emoji="🔥" size={13} />
      <span className="tabular-nums">{count > 0 ? count : ''}</span>
    </button>
  )
}
