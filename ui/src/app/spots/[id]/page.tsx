import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { MapPin, ExternalLink, BadgeCheck, Building2, Star, Eye, Phone, Globe, Clock, DollarSign, ChevronDown } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'
import { getSpot, getSpotReviews } from '@/lib/api'
import { ReviewCard } from '@/components/spots/ReviewCard'
import { AddReviewForm } from '@/components/spots/AddReviewForm'
import { VoteButton } from '@/components/spots/VoteButton'
import { TrackView } from '@/components/spots/TrackView'
import { SpotLiveDataInline } from '@/components/spots/SpotLiveDataInline'
import { formatRating, formatReviewCount, cn } from '@/lib/utils'
import { getTagDef, getTagStyle } from '@/lib/tags'
import { EmojiIcon } from '@/components/ui/EmojiIcon'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  try {
    const spot = await getSpot(id)
    return {
      title: `${spot.name} — FindTopSpots`,
      description: spot.description?.slice(0, 155),
    }
  } catch {
    return { title: 'Spot — FindTopSpots' }
  }
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  restaurant: { bg: 'bg-rose-500/20',    text: 'text-rose-100',    label: 'Restaurant' },
  cafe:        { bg: 'bg-amber-500/20',  text: 'text-amber-100',  label: 'Cafe' },
  bar:         { bg: 'bg-violet-500/20', text: 'text-violet-100', label: 'Bar' },
  park:        { bg: 'bg-emerald-500/20',text: 'text-emerald-100',label: 'Park' },
  gym:         { bg: 'bg-blue-500/20',   text: 'text-blue-100',   label: 'Gym' },
  shop:        { bg: 'bg-pink-500/20',   text: 'text-pink-100',   label: 'Shop' },
  attraction:  { bg: 'bg-orange-500/20', text: 'text-orange-100', label: 'Attraction' },
  other:       { bg: 'bg-white/20',      text: 'text-white/90',   label: 'Other' },
}

async function SpotReviews({ spotId, currentUserId }: { spotId: string; currentUserId?: string }) {
  const reviews = await getSpotReviews(spotId)
  if (reviews.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
        No reviews yet — be the first!
      </p>
    )
  }
  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review as Parameters<typeof ReviewCard>[0]['review']}
          {...(currentUserId !== undefined ? { currentUserId } : {})}
        />
      ))}
    </div>
  )
}

export default async function SpotDetailPage({ params }: Props) {
  const { id } = await params
  const { userId, getToken } = await auth()
  const token = userId ? await getToken() : null
  const spot = await getSpot(id, token ?? undefined)

  const canReview = Boolean(userId)
  const cat = CATEGORY_STYLES[spot.category] ?? CATEGORY_STYLES.other!

  const allPhotos = [
    ...(spot.coverPhotoUrl ? [spot.coverPhotoUrl] : []),
    ...(spot.photos?.map((p) => p.url).filter((u) => u !== spot.coverPhotoUrl) ?? []),
  ]
  const heroPhoto = allPhotos[0] ?? null

  return (
    <div className="mx-auto max-w-3xl">
      <TrackView
        id={spot.id}
        name={spot.name}
        coverPhotoUrl={spot.coverPhotoUrl ?? null}
        category={spot.category}
        avgRating={spot.avgRating}
        address={spot.address}
      />

      {/* ── Hero ── */}
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 h-80 sm:h-96 overflow-hidden bg-[var(--color-surface-3)]">
        {heroPhoto ? (
          <img
            src={heroPhoto}
            alt={spot.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <MapPin className="h-16 w-16 text-[var(--color-text-muted)] opacity-20" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

        {/* Category badge — top left */}
        <div className="absolute top-4 left-4">
          <span data-testid="spot-category" className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm', cat.bg, cat.text)}>
            {cat.label}
          </span>
          {spot.isVerifiedBusiness && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-100 backdrop-blur-sm">
              <BadgeCheck className="h-3 w-3" />
              Verified
            </span>
          )}
        </div>

        {/* Vote — top right, floating */}
        <div data-testid="vote-button-wrapper" className="absolute top-4 right-4">
          <VoteButton spotId={spot.id} initialCount={spot.voteCount ?? 0} {...(spot.userVoted !== undefined ? { initialVoted: spot.userVoted } : {})} size="md" />
        </div>

        {/* Name + address overlaid at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl drop-shadow-lg">
            {spot.name}
          </h1>
          <a
            data-testid="spot-address"
            href={`https://www.google.com/maps?q=${spot.lat},${spot.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {spot.address}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div data-testid="stats-bar" className="flex flex-wrap items-center gap-4 border-b border-[var(--color-border)] py-4">
        <div className="flex items-center gap-1.5">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span data-testid="spot-avg-rating" className="text-base font-bold text-[var(--color-text-primary)]">{formatRating(spot.avgRating)}</span>
          <span data-testid="spot-review-count" className="text-sm text-[var(--color-text-muted)]">{formatReviewCount(spot.reviewCount)}</span>
        </div>
        {(spot.viewCount ?? 0) > 0 && (
          <div data-testid="spot-view-count" className="flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
            <Eye className="h-3.5 w-3.5" />
            {(spot.viewCount ?? 0).toLocaleString()} views
          </div>
        )}
        {spot.isVerifiedBusiness && (
          <span className="ml-auto flex items-center gap-1 text-xs font-medium text-emerald-600">
            <BadgeCheck className="h-3.5 w-3.5" />
            Verified business
          </span>
        )}
      </div>

      {/* ── Live info (open now, hours, price, Google rating) ── */}
      <SpotLiveDataInline spotId={id} />

      {/* ── About ── */}
      {spot.description && spot.description.length > 0 && (
        <section className="border-b border-[var(--color-border)] py-6 space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">About</h2>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{spot.description}</p>
        </section>
      )}

      {/* ── Tags ── */}
      {spot.tags && spot.tags.length > 0 && (
        <section className="border-b border-[var(--color-border)] py-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {spot.tags.map((tag) => {
              const def = getTagDef(tag)
              const style = getTagStyle(tag)
              return (
                <Link
                  key={tag}
                  href={`/spots?tag=${encodeURIComponent(tag)}`}
                  className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-80', style.bg, style.text)}
                >
                  {def?.emoji && <EmojiIcon emoji={def.emoji} size={14} />}
                  {def?.label ?? tag}
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Reviews ── */}
      <section data-testid="reviews-section" className="py-6 space-y-5">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
          Reviews
          {spot.reviewCount > 0 && (
            <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">({spot.reviewCount})</span>
          )}
        </h2>

        {canReview && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
            <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">Write a Review</h3>
            <AddReviewForm spotId={id} />
          </div>
        )}

        {!userId && (
          <p className="text-sm text-[var(--color-text-muted)]">
            <Link href="/sign-in" className="font-medium text-amber-500 hover:text-amber-400 transition-colors">Sign in</Link>
            {' '}to write a review.
          </p>
        )}

        <Suspense fallback={
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-[var(--color-surface-2)]" />
            ))}
          </div>
        }>
          <SpotReviews spotId={id} {...(spot.dbUserId ? { currentUserId: spot.dbUserId } : {})} />
        </Suspense>
      </section>

      {/* ── Business claim CTA ── */}
      {!spot.isVerifiedBusiness && (
        <div data-testid="claim-banner" className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10">
              <Building2 className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Is this your business?</p>
              <p className="text-xs text-[var(--color-text-muted)]">Claim it to respond to reviews and manage your listing.</p>
            </div>
          </div>
          <Link
            href={`/spots/${spot.id}/claim`}
            className="shrink-0 rounded-xl border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-600 hover:bg-amber-400 hover:text-amber-950 transition-colors"
          >
            Claim listing
          </Link>
        </div>
      )}
    </div>
  )
}
