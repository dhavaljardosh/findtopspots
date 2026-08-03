'use client'

import { useRef, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { CreateReviewSchema, type CreateReview } from '@fts/types'
import { createReview } from '@/lib/api'
import { spotKeys } from '@/lib/hooks/use-spots'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface AddReviewFormProps {
  spotId: string
}

interface ExistingReview {
  id: string
  rating: number
  body: string
}

const inputClass =
  'w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-colors'

const errorClass = 'mt-1 text-xs text-red-500'
const labelClass = 'block text-sm font-medium text-[var(--color-text-secondary)] mb-1'

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="flex gap-1" onMouseLeave={() => setHovered(0)} role="group" aria-label="Select rating">
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1
        const isActive = (hovered || value) >= starValue
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(starValue)}
            onMouseEnter={() => setHovered(starValue)}
            aria-label={`Rate ${starValue} star${starValue !== 1 ? 's' : ''}`}
            className="p-0.5 transition-transform hover:scale-110 focus:outline-none rounded"
          >
            <Star className={cn('h-7 w-7 transition-colors', isActive ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200')} />
          </button>
        )
      })}
    </div>
  )
}

export function AddReviewForm({ spotId }: AddReviewFormProps) {
  const { getToken, isSignedIn } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const tokenRef = useRef<string | undefined>(undefined)
  const [submitted, setSubmitted] = useState(false)
  const [existingReview, setExistingReview] = useState<ExistingReview | null>(null)
  const [checkingExisting, setCheckingExisting] = useState(true)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateReview>({
    resolver: zodResolver(CreateReviewSchema),
    defaultValues: { rating: 0, body: '' },
  })

  // Check if user already reviewed this spot
  useEffect(() => {
    if (!isSignedIn) { setCheckingExisting(false); return }
    void (async () => {
      try {
        const token = await getToken()
        const res = await fetch(`${API_URL}/api/v1/spots/${spotId}/reviews/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json() as { review: ExistingReview | null }
          if (data.review) {
            setExistingReview(data.review)
            setValue('rating', data.review.rating)
            setValue('body', data.review.body)
          }
        }
      } catch { /* ignore */ }
      setCheckingExisting(false)
    })()
  }, [isSignedIn, spotId, getToken, setValue])

  const mutation = useMutation({
    mutationFn: (data: CreateReview) => createReview(spotId, data, tokenRef.current),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: spotKeys.detail(spotId) })
      void queryClient.invalidateQueries({ queryKey: spotKeys.reviews(spotId) })
    },
  })

  const ratingValue = watch('rating')

  const onSubmit = async (data: CreateReview) => {
    tokenRef.current = (await getToken()) ?? undefined
    if (!tokenRef.current) {
      toast.error('You must be signed in to leave a review.')
      return
    }

    try {
      if (existingReview) {
        // Edit existing review
        const res = await fetch(`${API_URL}/api/v1/spots/${spotId}/reviews/${existingReview.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenRef.current}` },
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({})) as { error?: string }
          toast.error(d.error ?? 'Failed to update review.')
          return
        }
        toast.success('Review updated!')
      } else {
        await mutation.mutateAsync(data)
        toast.success('Review submitted — thank you!')
      }
      reset()
      setSubmitted(true)
      router.refresh()
    } catch (err) {
      const msg = (err as { data?: { error?: string } })?.data?.error ?? 'Failed to submit review. Please try again.'
      console.error('[AddReviewForm] submit error:', err)
      toast.error(msg)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
        {existingReview ? 'Review updated. Thank you!' : 'Review submitted — thank you!'}
      </div>
    )
  }

  if (checkingExisting) {
    return <div className="h-36 animate-pulse rounded-xl bg-[var(--color-surface-2)]" />
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {existingReview && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-400/10 rounded-lg px-3 py-2">
          You already reviewed this spot. Editing your existing review.
        </p>
      )}

      <div>
        <label className={labelClass}>Rating <span className="text-red-500">*</span></label>
        <StarPicker value={ratingValue} onChange={(v) => setValue('rating', v, { shouldValidate: true })} />
        {errors.rating && <p className={errorClass}>{errors.rating.message}</p>}
      </div>

      <div>
        <label htmlFor="review-body" className={labelClass}>
          Your Review <span className="ml-1 font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          id="review-body"
          rows={4}
          placeholder="Share your experience at this spot..."
          className={cn(inputClass, 'resize-none', errors.body && 'border-red-400 focus:border-red-400 focus:ring-red-400/30')}
          {...register('body')}
        />
        {errors.body && <p className={errorClass}>{errors.body.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || mutation.isPending}
        className="rounded-xl bg-amber-400 px-6 py-2.5 text-sm font-bold text-amber-950 hover:bg-amber-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {mutation.isPending || isSubmitting
          ? 'Submitting…'
          : existingReview ? 'Update Review' : 'Submit Review'}
      </button>
    </form>
  )
}
