/**
 * Targeted seed for Austin-area Indian food + parks/outdoors.
 * Austin has a large Indian community (Round Rock, Cedar Park, Pflugerville).
 * Run: bun run scripts/seed-austin-indian-parks.ts
 */

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq } from 'drizzle-orm'
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

if (!GOOGLE_API_KEY) { console.error('Missing GOOGLE_PLACES_API_KEY'); process.exit(1) }
if (!DATABASE_URL) { console.error('Missing DATABASE_URL'); process.exit(1) }

const sql = neon(DATABASE_URL)
const db = drizzle(sql, { schema })

const GOOGLE_BASE = 'https://places.googleapis.com/v1'

type Category = schema.spotCategoryEnum['enumValues'][number]

// ─── Austin metro — all the suburbs with large Indian populations ─────────────

const LOCATIONS: Array<{ name: string; state: string; lat: number; lng: number }> = [
  { name: 'Austin',        state: 'TX', lat: 30.2672,  lng: -97.7431 },
  { name: 'Round Rock',    state: 'TX', lat: 30.5083,  lng: -97.6789 },
  { name: 'Cedar Park',    state: 'TX', lat: 30.5052,  lng: -97.8203 },
  { name: 'Pflugerville',  state: 'TX', lat: 30.4394,  lng: -97.6200 },
  { name: 'Georgetown',    state: 'TX', lat: 30.6333,  lng: -97.6775 },
  { name: 'Kyle',          state: 'TX', lat: 29.9891,  lng: -97.8772 },
  { name: 'Leander',       state: 'TX', lat: 30.5785,  lng: -97.8530 },
  { name: 'Hutto',         state: 'TX', lat: 30.5432,  lng: -97.5489 },
]

// ─── Indian food queries ──────────────────────────────────────────────────────

const INDIAN_QUERIES: Array<{ template: string; category: Category }> = [
  { template: 'best Indian restaurants in {city} {state}',          category: 'restaurant' },
  { template: 'best South Indian restaurants in {city} {state}',    category: 'restaurant' },
  { template: 'best North Indian restaurants in {city} {state}',    category: 'restaurant' },
  { template: 'Indian buffet in {city} {state}',                    category: 'restaurant' },
  { template: 'best biryani in {city} {state}',                     category: 'restaurant' },
  { template: 'best dosa restaurants in {city} {state}',            category: 'restaurant' },
  { template: 'best butter chicken in {city} {state}',              category: 'restaurant' },
  { template: 'best vegetarian Indian food in {city} {state}',      category: 'restaurant' },
  { template: 'best Indian street food in {city} {state}',          category: 'restaurant' },
  { template: 'Indian grocery stores in {city} {state}',            category: 'shop' },
  { template: 'Indian sweets shop in {city} {state}',               category: 'restaurant' },
  { template: 'best chai tea in {city} {state}',                    category: 'cafe' },
  { template: 'Patel Brothers grocery {city} {state}',              category: 'shop' },
  { template: 'Indian cultural center {city} {state}',              category: 'attraction' },
  { template: 'Hindu temple near {city} {state}',                   category: 'attraction' },
]

// ─── Parks & outdoors queries ─────────────────────────────────────────────────

const PARK_QUERIES: Array<{ template: string; category: Category }> = [
  { template: 'best parks in {city} {state}',                       category: 'park' },
  { template: 'best hiking trails near {city} {state}',             category: 'park' },
  { template: 'best swimming holes near {city} {state}',            category: 'park' },
  { template: 'best nature preserves near {city} {state}',          category: 'park' },
  { template: 'best greenbelt trails in {city} {state}',            category: 'park' },
  { template: 'best dog parks in {city} {state}',                   category: 'park' },
  { template: 'best waterfront parks near {city} {state}',          category: 'park' },
  { template: 'best family parks in {city} {state}',                category: 'park' },
  { template: 'best outdoor recreation near {city} {state}',        category: 'park' },
]

// Specific well-known Austin landmarks (queried directly, not per-suburb)
const AUSTIN_SPECIFIC: Array<{ query: string; category: Category }> = [
  { query: 'Barton Springs Pool Austin TX',          category: 'park' },
  { query: 'Zilker Park Austin TX',                  category: 'park' },
  { query: 'Barton Creek Greenbelt Austin TX',       category: 'park' },
  { query: 'McKinney Falls State Park Austin TX',    category: 'park' },
  { query: 'Enchanted Rock near Austin TX',          category: 'park' },
  { query: 'Hamilton Pool Preserve Austin TX',       category: 'park' },
  { query: 'Pedernales Falls State Park TX',         category: 'park' },
  { query: 'Lake Travis Austin TX',                  category: 'park' },
  { query: 'Bull Creek Greenbelt Austin TX',         category: 'park' },
  { query: 'Wild Basin Wilderness Preserve Austin',  category: 'park' },
  { query: 'Shoal Creek Trail Austin TX',            category: 'park' },
  { query: 'Govalle Park Austin TX',                 category: 'park' },
  { query: 'Indian Spice grocery Austin TX',         category: 'shop' },
  { query: 'Arya Bhavan vegetarian Austin TX',       category: 'restaurant' },
  { query: 'MTR Foods Austin TX',                    category: 'restaurant' },
  { query: 'Tarka Indian Kitchen Austin TX',         category: 'restaurant' },
  { query: 'G\'Raj Mahal Austin TX',                 category: 'restaurant' },
  { query: 'Saffron Austin TX Indian restaurant',    category: 'restaurant' },
  { query: 'Swad Indian restaurant Austin TX',       category: 'restaurant' },
  { query: 'Sri Krishna Sweets Austin TX',           category: 'restaurant' },
  { query: 'Dosa Republic Austin TX',                category: 'restaurant' },
  { query: 'Austin Hindu temple',                    category: 'attraction' },
  { query: 'BAPS Swaminarayan Mandir Austin',        category: 'attraction' },
  { query: 'Meenakshi temple Austin TX',             category: 'attraction' },
]

// ─── Google Places helpers ────────────────────────────────────────────────────

interface GooglePlace {
  id: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  editorialSummary?: { text?: string }
  photos?: Array<{ name?: string }>
}

async function searchGoogle(query: string, lat: number, lng: number): Promise<GooglePlace[]> {
  const body = {
    textQuery: query,
    locationBias: {
      circle: { center: { latitude: lat, longitude: lng }, radius: 20000.0 },
    },
    rankPreference: 'RELEVANCE',
    maxResultCount: 10,
  }

  const res = await fetch(`${GOOGLE_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'X-Goog-Api-Key': GOOGLE_API_KEY!,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.editorialSummary,places.photos',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    console.warn(`  Google search failed "${query}": ${res.status}`)
    return []
  }

  const data = (await res.json()) as { places?: GooglePlace[] }
  return data.places ?? []
}

async function fetchPhotoUri(photoName: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${GOOGLE_BASE}/${photoName}/media?key=${GOOGLE_API_KEY}&maxWidthPx=800&skipHttpRedirect=true`,
    )
    if (!res.ok) return null
    const data = (await res.json()) as { photoUri?: string }
    return data.photoUri ?? null
  } catch {
    return null
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function insertPlace(
  place: GooglePlace,
  category: Category,
  userId: string,
  existingGIds: Set<string | null | undefined>,
  cityName: string,
  stateName: string,
): Promise<boolean> {
  if (!place.id || !place.location?.latitude || !place.location?.longitude) return false
  if (existingGIds.has(place.id)) return false
  const name = place.displayName?.text
  if (!name) return false

  const address = place.formattedAddress ?? `${cityName}, ${stateName}`
  const description =
    place.editorialSummary?.text ??
    `${name} is a popular ${category} in ${cityName}, ${stateName}.`

  let coverPhotoUrl: string | null = null
  if (place.photos?.[0]?.name) {
    coverPhotoUrl = await fetchPhotoUri(place.photos[0].name)
  }

  try {
    await db.insert(schema.spots).values({
      name,
      description,
      category,
      lat: place.location.latitude,
      lng: place.location.longitude,
      address,
      createdBy: userId,
      googlePlaceId: place.id,
      coverPhotoUrl,
      featuredBy: 'austinindians',
    })
    existingGIds.add(place.id)
    console.log(`    +ADDED: ${name}${coverPhotoUrl ? ' 📷' : ''}`)
    return true
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (!msg.includes('unique') && !msg.includes('duplicate')) {
      console.error(`    ERROR: ${name}: ${msg}`)
    }
    return false
  }
}

async function main() {
  const firstUser = await db.query.users.findFirst()
  if (!firstUser) { console.error('No users found'); process.exit(1) }
  const userId = firstUser.id
  console.log(`Using user: ${firstUser.username} (${userId})`)

  const existingRows = await db.select({ googlePlaceId: schema.spots.googlePlaceId }).from(schema.spots)
  const existingGIds = new Set(existingRows.map((s) => s.googlePlaceId))
  console.log(`Existing spots: ${existingGIds.size}\n`)

  let inserted = 0

  // ── Austin-specific landmarks (single searches, no city template) ───────────
  console.log('═══ Austin-specific landmarks ═══')
  for (const { query, category } of AUSTIN_SPECIFIC) {
    console.log(`  "${query}"`)
    const places = await searchGoogle(query, 30.2672, -97.7431)
    for (const place of places) {
      if (await insertPlace(place, category, userId, existingGIds, 'Austin', 'TX')) inserted++
    }
    await Bun.sleep(150)
  }

  // ── Indian food + parks per suburb ────────────────────────────────────────
  for (const loc of LOCATIONS) {
    console.log(`\n═══ ${loc.name}, ${loc.state} ═══`)

    for (const { template, category } of [...INDIAN_QUERIES, ...PARK_QUERIES]) {
      const query = template.replace('{city}', loc.name).replace('{state}', loc.state)
      console.log(`  "${query}"`)
      const places = await searchGoogle(query, loc.lat, loc.lng)
      for (const place of places) {
        if (await insertPlace(place, category, userId, existingGIds, loc.name, loc.state)) inserted++
      }
      await Bun.sleep(150)
    }
  }

  console.log(`\n✓ Done. Inserted: ${inserted}`)
}

main().catch((err) => { console.error('Seed failed:', err); process.exit(1) })
