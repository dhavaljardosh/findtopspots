import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MapPin, Star, MessageSquare } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface UserProfile {
  id: string
  username: string
  displayName?: string | null
  avatarUrl?: string | null
  bio?: string | null
  createdAt: string
}

interface Spot {
  id: string
  name: string
  category: string
  address: string
  avgRating: number
  reviewCount: number
  coverPhotoUrl?: string | null
}

async function fetchUser(id: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/users/${id}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return await res.json() as UserProfile
  } catch {
    return null
  }
}

async function fetchUserSpots(id: string): Promise<Spot[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/users/${id}/spots?limit=12`, { next: { revalidate: 60 } })
    if (!res.ok) return []
    const data = await res.json() as { spots: Spot[] }
    return data.spots ?? []
  } catch {
    return []
  }
}

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const user = await fetchUser(id)
  if (!user) return { title: 'User — FindTopSpots' }
  const name = user.displayName ?? user.username
  return { title: `${name} — FindTopSpots`, description: user.bio ?? undefined }
}

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant', cafe: 'Cafe', bar: 'Bar',
  park: 'Park', gym: 'Gym', shop: 'Shop', attraction: 'Attraction', other: 'Other',
}

export default async function UserProfilePage({ params }: Props) {
  const { id } = await params
  const [user, spots] = await Promise.all([fetchUser(id), fetchUserSpots(id)])

  if (!user) notFound()

  const displayName = user.displayName ?? user.username
  const joinYear = new Date(user.createdAt).getFullYear()

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      {/* Header */}
      <div className="flex items-start gap-5">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={displayName}
            className="h-20 w-20 rounded-full object-cover ring-2 ring-gray-200 flex-shrink-0"
          />
        ) : (
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
          {user.displayName && (
            <p className="text-sm text-gray-500">@{user.username}</p>
          )}
          {user.bio && (
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{user.bio}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">Member since {joinYear}</p>
        </div>
      </div>

      {/* Spots added */}
      {spots.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Spots added ({spots.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {spots.map((spot) => (
              <Link
                key={spot.id}
                href={`/spots/${spot.id}`}
                className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                {spot.coverPhotoUrl ? (
                  <img
                    src={spot.coverPhotoUrl}
                    alt={spot.name}
                    className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <MapPin className="h-6 w-6 text-gray-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{spot.name}</p>
                  <p className="text-xs text-gray-500 truncate">{spot.address}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span className="capitalize">{CATEGORY_LABELS[spot.category] ?? spot.category}</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {spot.avgRating.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MessageSquare className="h-3 w-3" />
                      {spot.reviewCount}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {spots.length === 0 && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-10 text-center">
          <MapPin className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No spots added yet.</p>
          <Link
            href="/spots/new"
            className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Add a spot
          </Link>
        </div>
      )}
    </div>
  )
}
