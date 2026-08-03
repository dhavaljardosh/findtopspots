/**
 * Backfill coverPhotoUrl for existing spots that have a googlePlaceId but no photo.
 * Run: bun run scripts/backfill-photos.ts
 */

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq, isNull, isNotNull } from 'drizzle-orm'
import * as schema from '../src/db/schema'

const envFile = Bun.file(`${import.meta.dir}/../.env`)
if (await envFile.exists()) {
  const text = await envFile.text()
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx < 0) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
}

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY
const DATABASE_URL = process.env.DATABASE_URL
if (!GOOGLE_API_KEY || !DATABASE_URL) { console.error('Missing env vars'); process.exit(1) }

const sql = neon(DATABASE_URL)
const db = drizzle(sql, { schema })
const GOOGLE_BASE = 'https://places.googleapis.com/v1'

async function getPhotoNameForPlace(googlePlaceId: string): Promise<string | null> {
  const res = await fetch(`${GOOGLE_BASE}/places/${encodeURIComponent(googlePlaceId)}`, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_API_KEY!,
      'X-Goog-FieldMask': 'photos',
    },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { photos?: Array<{ name?: string }> }
  return data.photos?.[0]?.name ?? null
}

async function fetchPhotoUri(photoName: string): Promise<string | null> {
  const res = await fetch(
    `${GOOGLE_BASE}/${photoName}/media?key=${GOOGLE_API_KEY}&maxWidthPx=800&skipHttpRedirect=true`,
  )
  if (!res.ok) return null
  const data = (await res.json()) as { photoUri?: string }
  return data.photoUri ?? null
}

async function main() {
  const spots = await db
    .select({ id: schema.spots.id, googlePlaceId: schema.spots.googlePlaceId, name: schema.spots.name })
    .from(schema.spots)
    .where(isNull(schema.spots.coverPhotoUrl))

  const withGoogle = spots.filter((s) => s.googlePlaceId)
  console.log(`Spots missing coverPhotoUrl: ${spots.length} (${withGoogle.length} have googlePlaceId)`)

  let updated = 0
  let failed = 0

  for (const spot of withGoogle) {
    try {
      const photoName = await getPhotoNameForPlace(spot.googlePlaceId!)
      if (!photoName) { console.log(`  NO PHOTO: ${spot.name}`); failed++; continue }

      const photoUri = await fetchPhotoUri(photoName)
      if (!photoUri) { console.log(`  NO URI: ${spot.name}`); failed++; continue }

      await db.update(schema.spots).set({ coverPhotoUrl: photoUri }).where(eq(schema.spots.id, spot.id))
      console.log(`  ✓ ${spot.name}`)
      updated++
    } catch (err) {
      console.error(`  ERROR ${spot.name}:`, err)
      failed++
    }

    await Bun.sleep(150)
  }

  console.log(`\n✓ Updated: ${updated}, Failed: ${failed}`)
}

main().catch((err) => { console.error('Backfill failed:', err); process.exit(1) })
