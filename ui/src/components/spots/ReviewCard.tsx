'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Pencil, Building2, CheckCircle } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { StarRating } from './StarRating'
import { cn } from '@/lib/utils'

interface OwnerReply {
  id: string
  body: string
  createdAt: string
}

interface EnrichedReview {
  id: string
  spotId: string
  userId: string
  rating: number
  body: string
  helpfulCount: number
  isEdited?: boolean
  updatedAt?: string | null
  createdAt: string
  authorDisplayName?: string | null
  authorAvatarUrl?: string | null
  authorId?: string
  ownerReply?: OwnerReply | null
}

interface ReviewCardProps {
  review: EnrichedReview
  currentUserId?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function AuthorAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null | undefined }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-1 ring-[var(--color-border)]"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
    )
  }
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-sm font-bold text-amber-600 select-none">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export function ReviewCard({ review, currentUserId }: ReviewCardProps) {
  const { getToken } = useAuth()
  const displayName = review.authorDisplayName ?? `User ${review.userId.slice(0, 8)}`
  const authorId = review.authorId ?? review.userId
  const isOwn = currentUserId === review.userId

  const [editing, setEditing] = useState(false)
  const [editRating, setEditRating] = useState(review.rating)
  const [editBody, setEditBody] = useState(review.body)
  const [saving, setSaving] = useState(false)
  const [localReview, setLocalReview] = useState(review)

  const saveEdit = async () => {
    setSaving(true)
    try {
      const token = await getToken()
      const res = await fetch(`${API_URL}/api/v1/spots/${review.spotId}/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: editRating, body: editBody }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        toast.error(d.error ?? 'Failed to update review')
        setSaving(false)
        return
      }
      const updated = await res.json() as typeof review
      setLocalReview((prev) => ({ ...prev, rating: editRating, body: editBody, isEdited: true, updatedAt: (updated as { updatedAt?: string | null }).updatedAt ?? null }))
      setEditing(false)
      toast.success('Review updated!')
    } catch {
      toast.error('Failed to update review')
    }
    setSaving(false)
  }

  return (
    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 shadow-[var(--shadow-sm)] space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/users/${authorId}`}>
            <AuthorAvatar name={displayName} avatarUrl={localReview.authorAvatarUrl} />
          </Link>
          <div>
            <Link
              href={`/users/${authorId}`}
              className="text-sm font-semibold text-[var(--color-text-primary)] hover:text-amber-500 transition-colors"
            >
              {displayName}
            </Link>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-[var(--color-text-muted)]">{formatDate(localReview.createdAt)}</p>
              {localReview.isEdited && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface-2)] rounded px-1.5 py-0.5">
                  <Pencil className="h-2.5 w-2.5" />
                  edited
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StarRating rating={localReview.rating} size="sm" />
          {isOwn && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-secondary)] transition-colors"
              title="Edit your review"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          {/* Star picker */}
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => {
              const v = i + 1
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setEditRating(v)}
                  className={cn('text-2xl transition-transform hover:scale-110', editRating >= v ? 'text-amber-400' : 'text-gray-200')}
                >
                  ★
                </button>
              )
            })}
          </div>
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => void saveEdit()}
              disabled={saving}
              className="rounded-xl bg-amber-400 px-4 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-300 disabled:opacity-60 transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setEditing(false); setEditRating(localReview.rating); setEditBody(localReview.body) }}
              className="rounded-xl border border-[var(--color-border)] px-4 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{localReview.body}</p>
      )}

      {/* Owner reply */}
      {localReview.ownerReply && (
        <div className="ml-4 rounded-xl border-l-2 border-amber-400 bg-amber-400/5 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Building2 className="h-3.5 w-3.5" />
            Response from the owner
            <CheckCircle className="h-3.5 w-3.5" />
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{localReview.ownerReply.body}</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">{formatDate(localReview.ownerReply.createdAt)}</p>
        </div>
      )}
    </article>
  )
}
