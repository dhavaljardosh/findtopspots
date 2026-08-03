'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { ThumbsUp, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// 8 avatar slots matching the API's AVATAR_COUNT
const AVATARS = [
  { emoji: '🦊', bg: 'bg-orange-100', ring: 'ring-orange-200' },
  { emoji: '🦅', bg: 'bg-blue-100',   ring: 'ring-blue-200' },
  { emoji: '🐻', bg: 'bg-amber-100',  ring: 'ring-amber-200' },
  { emoji: '🐺', bg: 'bg-gray-100',   ring: 'ring-gray-200' },
  { emoji: '🦁', bg: 'bg-yellow-100', ring: 'ring-yellow-200' },
  { emoji: '🦋', bg: 'bg-purple-100', ring: 'ring-purple-200' },
  { emoji: '🌟', bg: 'bg-indigo-100', ring: 'ring-indigo-200' },
  { emoji: '🐬', bg: 'bg-cyan-100',   ring: 'ring-cyan-200' },
]

interface Comment {
  id: string
  spotId: string
  userId: string | null
  parentId: string | null
  body: string
  isAnonymous: boolean
  helpfulCount: number
  createdAt: string
  displayName: string
  avatarIndex: number
  avatarUrl?: string | null
  replies?: Comment[]
}

function Avatar({ displayName, avatarIndex, avatarUrl }: { displayName: string; avatarIndex: number; avatarUrl?: string | null | undefined }) {
  if (avatarIndex >= 0 && avatarIndex < AVATARS.length) {
    const av = AVATARS[avatarIndex]!
    return (
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ring-1 ${av.bg} ${av.ring} text-base select-none`}>
        {av.emoji}
      </div>
    )
  }
  // Real user — photo or initials
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className="h-8 w-8 flex-shrink-0 rounded-full object-cover ring-1 ring-gray-200"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
    )
  }
  const initials = displayName.slice(0, 2).toUpperCase()
  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white select-none">
      {initials}
    </div>
  )
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

interface CommentFormProps {
  spotId: string
  parentId?: string
  onSubmitted: (comment: Comment) => void
  onCancel?: () => void
  autoFocus?: boolean
}

function CommentForm({ spotId, parentId, onSubmitted, onCancel, autoFocus }: CommentFormProps) {
  const { isSignedIn, getToken } = useAuth()
  const [body, setBody] = useState('')
  const [anonEmail, setAnonEmail] = useState('')
  const [postAnon, setPostAnon] = useState(false)
  const [loading, setLoading] = useState(false)

  const isAnonymous = !isSignedIn || postAnon

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    if (!isSignedIn && !anonEmail.trim()) {
      toast.error('Email required to post anonymously.')
      console.error('[CommentsSection] anon email missing')
      return
    }
    setLoading(true)

    const token = isSignedIn ? await getToken() : null
    const payload: Record<string, unknown> = {
      body: body.trim(),
      isAnonymous,
      ...(parentId ? { parentId } : {}),
    }
    if (!isSignedIn) payload.anonEmail = anonEmail.trim()

    const res = await fetch(`${API_URL}/api/v1/spots/${spotId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const comment = await res.json() as Comment
      onSubmitted(comment)
      setBody('')
      toast.success(parentId ? 'Reply posted!' : 'Comment posted!')
    } else {
      const data = await res.json() as { error?: string }
      const msg = data.error ?? 'Failed to post comment.'
      console.error('[CommentsSection] post failed:', msg)
      toast.error(msg)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3">
      <textarea
        autoFocus={autoFocus}
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={parentId ? 'Write a reply...' : 'Share a tip, question, or experience...'}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
      />

      {/* Anon toggle for signed-in users */}
      {isSignedIn && (
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none w-fit">
          <input
            type="checkbox"
            checked={postAnon}
            onChange={(e) => setPostAnon(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Post anonymously
        </label>
      )}

      {/* Email for unauthenticated anon */}
      {!isSignedIn && (
        <input
          type="email"
          required
          value={anonEmail}
          onChange={(e) => setAnonEmail(e.target.value)}
          placeholder="Your email (never shown — used to generate your handle)"
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
        />
      )}

      {postAnon && isSignedIn && (
        <p className="text-xs text-gray-400">
          You&apos;ll appear as a generated handle like <span className="font-mono">SwiftFox4821</span>.
          Your account is still linked for moderation.
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={loading || !body.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Posting...' : parentId ? 'Reply' : 'Post'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

interface CommentItemProps {
  comment: Comment
  spotId: string
  onVote: (commentId: string, delta: number) => void
  depth?: number
}

function CommentItem({ comment, spotId, onVote, depth = 0 }: CommentItemProps) {
  const { getToken } = useAuth()
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replies, setReplies] = useState<Comment[]>(comment.replies ?? [])
  const [showReplies, setShowReplies] = useState(true)

  const handleVote = async (vote: 1 | -1) => {
    const token = await getToken()
    const res = await fetch(`${API_URL}/api/v1/spots/${spotId}/comments/${comment.id}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ vote }),
    })
    if (res.ok) {
      onVote(comment.id, vote)
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string }
      const msg = data.error ?? 'Failed to vote. Please try again.'
      console.error('[CommentsSection] vote failed:', msg)
      toast.error(msg)
    }
  }

  const handleReplySubmitted = (newComment: Comment) => {
    setReplies((prev) => [...prev, newComment])
    setShowReplyForm(false)
    setShowReplies(true)
  }

  const isDeleted = comment.body === '[deleted]'

  return (
    <div className={`flex gap-3 ${depth > 0 ? 'ml-10 mt-3' : ''}`}>
      <Avatar displayName={comment.displayName} avatarIndex={comment.avatarIndex} avatarUrl={comment.avatarUrl} />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          {comment.userId && !comment.isAnonymous ? (
            <Link href={`/users/${comment.userId}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">
              {comment.displayName}
            </Link>
          ) : (
            <span className="text-sm font-semibold text-gray-900">{comment.displayName}</span>
          )}
          {comment.isAnonymous && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">anon</span>
          )}
          <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
        </div>

        {isDeleted ? (
          <p className="mt-1 text-sm text-gray-400 italic">[deleted]</p>
        ) : (
          <p className="mt-1 text-sm text-gray-700 leading-relaxed">{comment.body}</p>
        )}

        {!isDeleted && (
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => void handleVote(1)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              <span>{comment.helpfulCount > 0 ? comment.helpfulCount : ''}</span>
            </button>

            {depth === 0 && (
              <button
                onClick={() => setShowReplyForm((v) => !v)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Reply
              </button>
            )}

            {depth === 0 && replies.length > 0 && (
              <button
                onClick={() => setShowReplies((v) => !v)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
        )}

        {showReplyForm && (
          <div className="mt-3">
            <CommentForm
              spotId={spotId}
              parentId={comment.id}
              onSubmitted={handleReplySubmitted}
              onCancel={() => setShowReplyForm(false)}
              autoFocus
            />
          </div>
        )}

        {showReplies && replies.length > 0 && (
          <div className="space-y-3 mt-2">
            {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                spotId={spotId}
                onVote={onVote}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function CommentsSection({ spotId }: { spotId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchComments = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/v1/spots/${spotId}/comments`)
    if (res.ok) {
      const data = await res.json() as { comments: Comment[] }
      setComments(data.comments ?? [])
    }
    setLoading(false)
  }, [spotId])

  useEffect(() => { void fetchComments() }, [fetchComments])

  const handleVote = (commentId: string, delta: number) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, helpfulCount: Math.max(0, c.helpfulCount + delta) }
          : c,
      ),
    )
  }

  const handleNewComment = (comment: Comment) => {
    setComments((prev) => [comment, ...prev])
  }

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        Community ({comments.length})
      </h2>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-gray-700 mb-3">Leave a comment</p>
        <CommentForm spotId={spotId} onSubmitted={handleNewComment} />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
                <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">No comments yet. Start the conversation!</p>
      ) : (
        <div className="space-y-5">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              spotId={spotId}
              onVote={handleVote}
            />
          ))}
        </div>
      )}
    </section>
  )
}
