'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ChevronLeft, ChevronRight, Upload, ImageIcon, MapPin, Check, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { PREDEFINED_TAG_GROUPS, getTagStyle } from '@/lib/tags'
import { CreateSpotSchema, type CreateSpot, type SpotCategory } from '@fts/types'
import { z } from 'zod'

// Form schema relaxes lat/lng — geocoding happens in onSubmit for manual-entry paths
const FormSchema = CreateSpotSchema.extend({
  lat: z.number().optional().default(0),
  lng: z.number().optional().default(0),
})
import { createSpot } from '@/lib/api'
import { spotKeys } from '@/lib/hooks/use-spots'
import { cn } from '@/lib/utils'
import { PlaceAutocomplete, type SelectedPlace } from '@/components/search/PlaceAutocomplete'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const CATEGORIES: { label: string; value: SpotCategory; emoji: string }[] = [
  { label: 'Restaurant', value: 'restaurant', emoji: '🍽️' },
  { label: 'Cafe',       value: 'cafe',       emoji: '☕' },
  { label: 'Bar',        value: 'bar',        emoji: '🍺' },
  { label: 'Park',       value: 'park',       emoji: '🌳' },
  { label: 'Gym',        value: 'gym',        emoji: '💪' },
  { label: 'Shop',       value: 'shop',       emoji: '🛍️' },
  { label: 'Attraction', value: 'attraction', emoji: '🎭' },
  { label: 'Other',      value: 'other',      emoji: '📍' },
]

async function uploadPhoto(spotId: string, file: File, token: string): Promise<void> {
  const presignRes = await fetch(`${API_URL}/api/v1/spots/${spotId}/photos/presign`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType: file.type, filename: file.name }),
  })
  if (!presignRes.ok) return
  const { uploadUrl, key } = await presignRes.json() as { uploadUrl: string; key: string; publicUrl: string }
  await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
  await fetch(`${API_URL}/api/v1/spots/${spotId}/photos/confirm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  })
}

type FormValues = z.infer<typeof FormSchema> & {
  foursquareId?: string
  googlePlaceId?: string
}

type Step = 1 | 2 | 3

const STEPS = [
  { n: 1, label: 'Find Place' },
  { n: 2, label: 'Details' },
  { n: 3, label: 'Photo' },
]

export function AddSpotForm() {
  const router = useRouter()
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const tokenRef = useRef<string | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>(1)
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [fsqPhotoUrl, setFsqPhotoUrl] = useState<string | null>(null)
  const [enriching, setEnriching] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // Manual address autocomplete state
  const [addrQuery, setAddrQuery] = useState('')
  const [addrSuggestions, setAddrSuggestions] = useState<Array<{ googlePlaceId?: string; name: string; address: string; lat: number; lng: number; category: string }>>([])
  const [addrSearching, setAddrSearching] = useState(false)
  const [addrPinned, setAddrPinned] = useState<{ name: string; address: string } | null>(null)
  const addrTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { category: 'restaurant', lat: 0, lng: 0 },
  })

  const categoryValue = watch('category')
  const tagsValue = watch('tags')

  const mutation = useMutation({
    mutationFn: (data: CreateSpot & Record<string, unknown>) => createSpot(data as CreateSpot & Record<string, unknown>, tokenRef.current),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: spotKeys.lists() }),
  })

  const handlePlaceSelect = (place: SelectedPlace) => {
    setSelectedPlace(place)
    setValue('name', place.name, { shouldValidate: true })
    setValue('address', place.address, { shouldValidate: true })
    setValue('lat', place.lat, { shouldValidate: true })
    setValue('lng', place.lng, { shouldValidate: true })
    setValue('category', place.category as SpotCategory, { shouldValidate: true })
    if (place.foursquareId) setValue('foursquareId', place.foursquareId)
    if (place.googlePlaceId) setValue('googlePlaceId', place.googlePlaceId)

    const enrichId = place.foursquareId
      ? { type: 'fsq', id: place.foursquareId }
      : place.googlePlaceId
      ? { type: 'google', id: place.googlePlaceId }
      : null

    if (enrichId) {
      setEnriching(true)
      const url = enrichId.type === 'fsq'
        ? `${API_URL}/api/v1/places/fsq/${enrichId.id}`
        : `${API_URL}/api/v1/places/google/${enrichId.id}`
      fetch(url)
        .then((r) => r.ok ? r.json() : null)
        .then((data: { description?: string | null; coverPhotoUrl?: string | null } | null) => {
          if (data?.description) setValue('description', data.description)
          if (data?.coverPhotoUrl && !photoFile) {
            setPhotoPreview(data.coverPhotoUrl)
            setFsqPhotoUrl(data.coverPhotoUrl)
          }
        })
        .catch(() => null)
        .finally(() => setEnriching(false))
    }
  }

  const clearPlace = () => {
    setSelectedPlace(null)
    setValue('name', '')
    setValue('address', '')
    setValue('lat', NaN as unknown as number)
    setValue('lng', NaN as unknown as number)
    setFsqPhotoUrl(null)
    setPhotoPreview(null)
    setPhotoFile(null)
    setGeocodeError(null)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
    setFsqPhotoUrl(null)
  }

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase()
    if (!tag) return
    const current = tagsValue ?? []
    if (!current.includes(tag) && current.length < 10) {
      setValue('tags', [...current, tag])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setValue('tags', (tagsValue ?? []).filter((t) => t !== tag))
  }

  const handleAddrInput = (value: string) => {
    setAddrQuery(value)
    setAddrPinned(null)
    setValue('address', value)
    setValue('lat', 0)
    setValue('lng', 0)

    if (addrTimer.current) clearTimeout(addrTimer.current)
    if (value.trim().length < 3) { setAddrSuggestions([]); return }

    addrTimer.current = setTimeout(async () => {
      setAddrSearching(true)
      try {
        const res = await fetch(`${API_URL}/api/v1/places/autocomplete?q=${encodeURIComponent(value)}&near=Austin,TX`)
        if (res.ok) {
          const data = await res.json() as { suggestions?: Array<{ googlePlaceId?: string; name: string; address: string; lat: number; lng: number; category: string }> }
          setAddrSuggestions(data.suggestions ?? [])
        }
      } catch { /* silent */ }
      setAddrSearching(false)
    }, 400)
  }

  const selectAddrSuggestion = (s: { googlePlaceId?: string; name: string; address: string; lat: number; lng: number; category: string }) => {
    setAddrQuery(s.address)
    setAddrSuggestions([])
    setAddrPinned({ name: s.name, address: s.address })
    setValue('address', s.address, { shouldValidate: true })
    setValue('lat', s.lat, { shouldValidate: true })
    setValue('lng', s.lng, { shouldValidate: true })
    if (s.googlePlaceId) setValue('googlePlaceId', s.googlePlaceId)
    setValue('name', s.name, { shouldValidate: true })
    setValue('category', (s.category as SpotCategory) ?? 'other', { shouldValidate: true })
    setGeocodeError(null)

    // Fetch description + cover photo from Google
    if (s.googlePlaceId) {
      setEnriching(true)
      fetch(`${API_URL}/api/v1/places/google/${s.googlePlaceId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data: { description?: string | null; coverPhotoUrl?: string | null } | null) => {
          if (data?.description) setValue('description', data.description)
          if (data?.coverPhotoUrl && !photoFile) {
            setPhotoPreview(data.coverPhotoUrl)
            setFsqPhotoUrl(data.coverPhotoUrl)
          }
        })
        .catch(() => null)
        .finally(() => setEnriching(false))
    }
  }

  const canGoNext = () => {
    if (step === 1) return Boolean(selectedPlace) || (showManual && Boolean(addrPinned))
    if (step === 2) return Boolean(watch('name'))
    return true
  }

  const onSubmit = async (data: FormValues) => {
    console.log('[AddSpotForm] onSubmit fired, data:', data)
    tokenRef.current = (await getToken()) ?? undefined
    console.log('[AddSpotForm] token present:', Boolean(tokenRef.current))
    if (!tokenRef.current) {
      toast.error('You must be signed in to add a spot.')
      console.error('[AddSpotForm] no auth token')
      return
    }

    const { foursquareId, googlePlaceId, ...coreData } = data
    const spotData = { ...coreData }

    if (!spotData.lat || !spotData.lng || isNaN(spotData.lat) || isNaN(spotData.lng)) {
      setGeocoding(true)
      setGeocodeError(null)
      try {
        const res = await fetch(`${API_URL}/api/v1/places/geocode?address=${encodeURIComponent(spotData.address)}`)
        if (!res.ok) {
          const msg = "Couldn't find that address. Try searching above instead."
          setGeocodeError(msg)
          toast.error(msg)
          console.error('[AddSpotForm] geocode failed for address:', spotData.address)
          setGeocoding(false)
          setStep(1)
          return
        }
        const geo = await res.json() as { lat: number; lng: number; address: string }
        spotData.lat = geo.lat
        spotData.lng = geo.lng
        spotData.address = geo.address
      } catch (e) {
        const msg = 'Location lookup failed. Please try again.'
        setGeocodeError(msg)
        toast.error(msg)
        console.error('[AddSpotForm] geocode exception:', e)
        setGeocoding(false)
        setStep(1)
        return
      }
      setGeocoding(false)
    }

    let spot: { id: string }
    try {
      spot = await mutation.mutateAsync({
        ...spotData,
        foursquareId,
        googlePlaceId,
        ...(fsqPhotoUrl && !photoFile ? { coverPhotoUrl: fsqPhotoUrl } : {}),
      })
    } catch (err: unknown) {
      const apiError = (err as { data?: { error?: string } })?.data?.error
      const httpMsg = (err as { message?: string })?.message ?? ''
      let msg = apiError ?? httpMsg
      if (!apiError) {
        if (httpMsg.includes('401')) msg = 'You must be signed in to add a spot.'
        else if (httpMsg.includes('409')) msg = 'This spot already exists in our database.'
        else if (httpMsg.includes('500')) msg = 'Something went wrong on our end. Please try again.'
        else if (!msg) msg = 'Failed to add spot. Please try again.'
      }
      console.error('[AddSpotForm] spot creation failed:', err)
      toast.error(msg)
      return
    }

    if (photoFile && tokenRef.current) {
      try { await uploadPhoto(spot.id, photoFile, tokenRef.current) } catch { /* non-critical */ }
    }

    setSubmitted(true)
  }

  const busy = mutation.isPending || geocoding || enriching

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
          <Check className="h-8 w-8 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">Spot submitted!</h3>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Your spot is pending review by our team — usually approved within 24 hours.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/spots')}
          className="rounded-xl bg-amber-400 px-6 py-2.5 text-sm font-bold text-amber-950 hover:bg-amber-300 transition-colors"
        >
          Browse spots
        </button>
      </div>
    )
  }

  // ── Wizard ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
      {/* Progress stepper */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
              step > s.n
                ? 'bg-amber-400 text-amber-950'
                : step === s.n
                ? 'bg-amber-400 text-amber-950 ring-4 ring-amber-400/20'
                : 'bg-[var(--color-surface-3)] text-[var(--color-text-muted)]',
            )}>
              {step > s.n ? <Check className="h-3.5 w-3.5" /> : s.n}
            </div>
            <span className={cn(
              'hidden text-xs font-medium sm:inline',
              step === s.n ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]',
            )}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'mx-1 h-px w-8 transition-colors',
                step > s.n ? 'bg-amber-400' : 'bg-[var(--color-border)]',
              )} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Find Place ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Find your place</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Search for any business, restaurant, park, or attraction.</p>
          </div>

          <PlaceAutocomplete
            onSelect={handlePlaceSelect}
            defaultCity="Austin,TX"
            placeholder="Search restaurants, cafes, parks..."
          />

          {selectedPlace && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-300/40 bg-amber-400/5 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10">
                <MapPin className="h-4 w-4 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{selectedPlace.name}</p>
                <p className="truncate text-xs text-[var(--color-text-secondary)]">{selectedPlace.address}</p>
              </div>
              <button type="button" onClick={clearPlace} className="shrink-0 rounded-full p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {enriching && (
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading place details…
            </div>
          )}

          {/* Manual entry toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowManual((v) => !v)}
              className="text-xs font-medium text-[var(--color-text-secondary)] underline underline-offset-2 hover:text-[var(--color-text-primary)] transition-colors"
            >
              {showManual ? "Hide manual entry" : "Can't find it? Enter manually"}
            </button>
          </div>

          {showManual && (
            <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
              {/* Address search with live autocomplete */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Search address or business name *
                </label>

                {/* Pinned confirmation */}
                {addrPinned ? (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/5 px-3 py-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[var(--color-text-primary)]">{addrPinned.name}</p>
                      <p className="truncate text-[11px] text-[var(--color-text-secondary)]">{addrPinned.address}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAddrPinned(null); setAddrQuery(''); setValue('lat', 0); setValue('lng', 0) }}
                      className="shrink-0 rounded-full p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
                      {addrSearching && (
                        <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[var(--color-text-muted)]" />
                      )}
                      <input
                        type="text"
                        value={addrQuery}
                        onChange={(e) => handleAddrInput(e.target.value)}
                        placeholder="e.g. 123 Main St Austin or Blue Bottle Coffee"
                        className={cn(
                          'w-full rounded-xl border bg-[var(--color-surface-1)] py-2.5 pl-9 pr-9 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20',
                          geocodeError ? 'border-red-500' : 'border-[var(--color-border-strong)]',
                        )}
                      />
                    </div>

                    {/* Suggestions dropdown */}
                    {addrSuggestions.length > 0 && (
                      <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-[var(--shadow-md)]">
                        {addrSuggestions.map((s, i) => (
                          <li key={s.googlePlaceId ?? i}>
                            <button
                              type="button"
                              onClick={() => selectAddrSuggestion(s)}
                              className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-[var(--color-surface-2)] transition-colors"
                            >
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{s.name}</p>
                                <p className="truncate text-xs text-[var(--color-text-muted)]">{s.address}</p>
                              </div>
                            </button>
                          </li>
                        ))}
                        <li className="border-t border-[var(--color-border)] px-3 py-2">
                          <p className="text-[11px] text-[var(--color-text-muted)]">Don&apos;t see it? Keep typing or enter the exact address above.</p>
                        </li>
                      </ul>
                    )}
                  </div>
                )}

                {geocodeError && <p className="mt-1 text-xs text-red-500">{geocodeError}</p>}
                {errors.address && !geocodeError && <p className="mt-1 text-xs text-red-500">{errors.address.message}</p>}
              </div>

              {/* Name — shown after pinning so user can confirm/edit */}
              {addrPinned && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Blue Bottle Coffee"
                    className={cn(
                      'w-full rounded-xl border bg-[var(--color-surface-1)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20',
                      errors.name ? 'border-red-500' : 'border-[var(--color-border-strong)]',
                    )}
                    {...register('name')}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                </div>
              )}

              {/* Hint when no suggestions and not pinned */}
              {!addrPinned && addrQuery.length < 3 && (
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Type at least 3 characters to search. We&apos;ll pin the coordinates automatically.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Details ──────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Add details</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Help others discover what makes this place special.</p>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Name *</label>
            <input
              type="text"
              placeholder="Place name"
              className={cn(
                'w-full rounded-xl border bg-[var(--color-surface-1)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20',
                errors.name ? 'border-red-500' : 'border-[var(--color-border-strong)]',
              )}
              {...register('name')}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Description <span className="font-normal normal-case text-[var(--color-text-muted)]">(optional)</span></label>
            <textarea
              rows={3}
              placeholder="What makes this spot special? Great for date night, amazing tacos, hidden gem…"
              className={cn(
                'w-full resize-none rounded-xl border bg-[var(--color-surface-1)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20',
                'border-[var(--color-border-strong)]',
              )}
              {...register('description')}
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Category *</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(({ label, value, emoji }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('category', value, { shouldValidate: true })}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all',
                    categoryValue === value
                      ? 'border-amber-400 bg-amber-400/10 text-amber-600 dark:text-amber-400'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-2)]',
                  )}
                >
                  <span className="text-xl leading-none">{emoji}</span>
                  <span className="text-[10px] font-semibold leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Tags <span className="font-normal normal-case text-[var(--color-text-muted)]">(optional)</span>
            </label>

            {/* Selected tags */}
            {(tagsValue ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(tagsValue ?? []).map((tag) => {
                  const style = getTagStyle(tag)
                  return (
                    <span key={tag} className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold', style.bg, style.text)}>
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="rounded-full opacity-70 hover:opacity-100">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* Predefined chips by group */}
            {PREDEFINED_TAG_GROUPS.map(({ group, tags }) => (
              <div key={group}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(({ value, label, emoji }) => {
                    const selected = (tagsValue ?? []).includes(value)
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => selected ? removeTag(value) : addTag(value)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all',
                          selected
                            ? 'bg-amber-400 text-amber-950'
                            : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)]',
                        )}
                      >
                        {emoji && <span>{emoji}</span>}
                        {label}
                        {selected && <X className="h-3 w-3 opacity-70" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Custom tag input */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Custom</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add your own tag…"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addTag(tagInput)
                    }
                  }}
                  className="flex-1 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] py-2 px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => addTag(tagInput)}
                  className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-3 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Photo ─────────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Add a photo</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">A great photo helps others find and trust this spot. Optional.</p>
          </div>

          {photoPreview ? (
            <div className="relative overflow-hidden rounded-2xl">
              <img src={photoPreview} alt="Preview" className="h-52 w-full object-cover" />
              <button
                type="button"
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); setFsqPhotoUrl(null) }}
                className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              {fsqPhotoUrl && !photoFile && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                  <span className="text-xs font-medium text-white/80">Auto-filled from Foursquare · click × to replace</span>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-2)] py-12 transition-colors hover:border-amber-400 hover:bg-amber-400/5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-surface-3)] group-hover:bg-amber-400/10 transition-colors">
                <ImageIcon className="h-6 w-6 text-[var(--color-text-muted)] group-hover:text-amber-500 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">Click to upload a photo</p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">JPG, PNG, WebP up to 10MB</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
                <Upload className="h-3.5 w-3.5" />
                Choose file
              </div>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={handlePhotoChange}
          />

        </div>
      )}

      {/* Hidden fields */}
      <input type="hidden" {...register('lat', { valueAsNumber: true })} />
      <input type="hidden" {...register('lng', { valueAsNumber: true })} />

      {/* Navigation */}
      <div className={cn('mt-8 flex gap-3', step === 1 ? 'justify-end' : 'justify-between')}>
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        )}

        {step < 3 ? (
          <button
            type="button"
            disabled={!canGoNext()}
            onClick={() => setStep((s) => (s + 1) as Step)}
            className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-amber-950 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-2.5 text-sm font-bold text-amber-950 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {geocoding ? 'Finding location…' : busy ? 'Submitting…' : 'Submit Spot'}
          </button>
        )}
      </div>
    </form>
  )
}
