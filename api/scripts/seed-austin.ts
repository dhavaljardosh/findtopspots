/**
 * Seed top spots across Texas (~30 cities).
 * Fetches Google Places cover photo URL and stores it in coverPhotoUrl.
 * Run: bun run seed:austin
 *
 * Requires DATABASE_URL and GOOGLE_PLACES_API_KEY in .env
 * Uses the first DB user, or creates a system user if none exists.
 *
 * Cost estimate: ~750 searchText calls × $17/1k = ~$12.75 one-time
 * Photo fetch: ~1 call per new spot at $0.007/call
 */

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq } from 'drizzle-orm'
import * as schema from '../src/db/schema'

// Load .env
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

const PRICE_MAP: Record<string, string> = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
}

// ─── Texas cities ─────────────────────────────────────────────────────────────

const CITIES: Array<{
  name: string
  state: string
  lat: number
  lng: number
}> = [
  // Major metros
  { name: 'Austin',        state: 'TX', lat: 30.2672,  lng: -97.7431 },
  { name: 'San Antonio',   state: 'TX', lat: 29.4241,  lng: -98.4936 },
  { name: 'Houston',       state: 'TX', lat: 29.7604,  lng: -95.3698 },
  { name: 'Dallas',        state: 'TX', lat: 32.7767,  lng: -96.7970 },
  { name: 'Fort Worth',    state: 'TX', lat: 32.7555,  lng: -97.3308 },
  { name: 'El Paso',       state: 'TX', lat: 31.7619,  lng: -106.4850 },
  { name: 'Arlington',     state: 'TX', lat: 32.7357,  lng: -97.1081 },
  { name: 'Corpus Christi',state: 'TX', lat: 27.8006,  lng: -97.3964 },
  { name: 'Plano',         state: 'TX', lat: 33.0198,  lng: -96.6989 },
  { name: 'Lubbock',       state: 'TX', lat: 33.5779,  lng: -101.8552 },
  { name: 'Laredo',        state: 'TX', lat: 27.5036,  lng: -99.5075 },
  { name: 'Irving',        state: 'TX', lat: 32.8140,  lng: -96.9489 },
  { name: 'Garland',       state: 'TX', lat: 32.9126,  lng: -96.6389 },
  { name: 'Frisco',        state: 'TX', lat: 33.1507,  lng: -96.8236 },
  { name: 'McKinney',      state: 'TX', lat: 33.1972,  lng: -96.6397 },
  // Mid-size cities
  { name: 'Waco',          state: 'TX', lat: 31.5493,  lng: -97.1467 },
  { name: 'Amarillo',      state: 'TX', lat: 35.2220,  lng: -101.8313 },
  { name: 'Beaumont',      state: 'TX', lat: 30.0860,  lng: -94.1018 },
  { name: 'Killeen',       state: 'TX', lat: 31.1171,  lng: -97.7278 },
  { name: 'McAllen',       state: 'TX', lat: 26.2034,  lng: -98.2300 },
  { name: 'Midland',       state: 'TX', lat: 31.9974,  lng: -102.0779 },
  { name: 'Abilene',       state: 'TX', lat: 32.4487,  lng: -99.7331 },
  { name: 'Brownsville',   state: 'TX', lat: 25.9017,  lng: -97.4975 },
  // Austin suburbs & Hill Country
  { name: 'San Marcos',    state: 'TX', lat: 29.8833,  lng: -97.9414 },
  { name: 'New Braunfels', state: 'TX', lat: 29.7030,  lng: -98.1245 },
  { name: 'Round Rock',    state: 'TX', lat: 30.5083,  lng: -97.6789 },
  { name: 'Cedar Park',    state: 'TX', lat: 30.5052,  lng: -97.8203 },
  { name: 'Georgetown',    state: 'TX', lat: 30.6333,  lng: -97.6775 },
  { name: 'Kyle',          state: 'TX', lat: 29.9891,  lng: -97.8772 },
  { name: 'Pflugerville',  state: 'TX', lat: 30.4394,  lng: -97.6200 },
  // Coastal & border
  { name: 'Galveston',     state: 'TX', lat: 29.3013,  lng: -94.7977 },
  { name: 'Port Aransas',  state: 'TX', lat: 27.8336,  lng: -97.0541 },
]

// ─── Category queries per city ────────────────────────────────────────────────

type Category = schema.spotCategoryEnum['enumValues'][number]

const CATEGORY_QUERIES: Array<{ template: string; category: Category }> = [
  // Restaurants — diverse cuisines
  { template: 'best restaurants in {city} {state}',              category: 'restaurant' },
  { template: 'best brunch spots in {city} {state}',             category: 'restaurant' },
  { template: 'best tacos in {city} {state}',                    category: 'restaurant' },
  { template: 'best Indian restaurants in {city} {state}',       category: 'restaurant' },
  { template: 'best Mexican restaurants in {city} {state}',      category: 'restaurant' },
  { template: 'best Italian restaurants in {city} {state}',      category: 'restaurant' },
  { template: 'best sushi in {city} {state}',                    category: 'restaurant' },
  { template: 'best BBQ in {city} {state}',                      category: 'restaurant' },
  { template: 'best burgers in {city} {state}',                  category: 'restaurant' },
  { template: 'best pizza in {city} {state}',                    category: 'restaurant' },
  { template: 'best Chinese restaurants in {city} {state}',      category: 'restaurant' },
  { template: 'best Thai restaurants in {city} {state}',         category: 'restaurant' },
  { template: 'best seafood restaurants in {city} {state}',      category: 'restaurant' },
  { template: 'best steakhouse in {city} {state}',               category: 'restaurant' },
  { template: 'best ramen in {city} {state}',                    category: 'restaurant' },
  { template: 'best desserts in {city} {state}',                 category: 'restaurant' },
  { template: 'best ice cream in {city} {state}',                category: 'restaurant' },
  // Cafes & drinks
  { template: 'best coffee shops in {city} {state}',             category: 'cafe' },
  { template: 'best tea shops in {city} {state}',                category: 'cafe' },
  { template: 'best boba tea in {city} {state}',                 category: 'cafe' },
  { template: 'best bakeries in {city} {state}',                 category: 'cafe' },
  // Bars & nightlife
  { template: 'best bars in {city} {state}',                     category: 'bar' },
  { template: 'best rooftop bars in {city} {state}',             category: 'bar' },
  { template: 'best cocktail bars in {city} {state}',            category: 'bar' },
  { template: 'best breweries in {city} {state}',                category: 'bar' },
  { template: 'best wine bars in {city} {state}',                category: 'bar' },
  // Parks & outdoors
  { template: 'best parks in {city} {state}',                    category: 'park' },
  { template: 'best hiking trails near {city} {state}',          category: 'park' },
  // Fitness
  { template: 'best gyms in {city} {state}',                     category: 'gym' },
  { template: 'best yoga studios in {city} {state}',             category: 'gym' },
  // Attractions & shopping
  { template: 'top things to do in {city} {state}',              category: 'attraction' },
  { template: 'best museums in {city} {state}',                  category: 'attraction' },
  { template: 'best entertainment in {city} {state}',            category: 'attraction' },
  { template: 'best shopping in {city} {state}',                 category: 'shop' },
  { template: 'best boutique shops in {city} {state}',           category: 'shop' },
]

// ─── Google Places helpers ────────────────────────────────────────────────────

interface GooglePlace {
  id: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  priceLevel?: string
  editorialSummary?: { text?: string }
  photos?: Array<{ name?: string }>
}

async function searchGoogle(query: string, lat: number, lng: number): Promise<GooglePlace[]> {
  const body = {
    textQuery: query,
    locationBias: {
      circle: { center: { latitude: lat, longitude: lng }, radius: 30000.0 },
    },
    rankPreference: 'RELEVANCE',
    maxResultCount: 10,
  }

  const res = await fetch(`${GOOGLE_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'X-Goog-Api-Key': GOOGLE_API_KEY!,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.priceLevel,places.editorialSummary,places.photos',
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

async function main() {
  // Get or create seed user
  let userId: string
  const firstUser = await db.query.users.findFirst()
  if (firstUser) {
    userId = firstUser.id
    console.log(`Using user: ${firstUser.username} (${userId})`)
  } else {
    const [sysUser] = await db
      .insert(schema.users)
      .values({ clerkId: 'system_seed', username: 'findtopspots' })
      .onConflictDoNothing()
      .returning()
    if (!sysUser) {
      const existing = await db.query.users.findFirst({ where: eq(schema.users.clerkId, 'system_seed') })
      if (!existing) { console.error('Cannot create seed user'); process.exit(1) }
      userId = existing.id
    } else {
      userId = sysUser.id
    }
    console.log(`Created system seed user (${userId})`)
  }

  const existingRows = await db.select({ googlePlaceId: schema.spots.googlePlaceId }).from(schema.spots)
  const existingGIds = new Set(existingRows.map((s) => s.googlePlaceId).filter(Boolean))
  console.log(`Existing spots: ${existingGIds.size}\n`)

  let inserted = 0
  let skipped = 0

  for (const city of CITIES) {
    console.log(`\n═══ ${city.name}, ${city.state} ═══`)

    for (const { template, category } of CATEGORY_QUERIES) {
      const query = template.replace('{city}', city.name).replace('{state}', city.state)
      console.log(`  "${query}"`)

      const places = await searchGoogle(query, city.lat, city.lng)

      for (const place of places) {
        if (!place.id || !place.location?.latitude || !place.location?.longitude) { skipped++; continue }
        if (existingGIds.has(place.id)) { skipped++; continue }

        const name = place.displayName?.text
        if (!name) { skipped++; continue }

        const address = place.formattedAddress ?? `${city.name}, ${city.state}`
        const description =
          place.editorialSummary?.text ??
          `${name} is a popular ${category} in ${city.name}, ${city.state}.`

        // Fetch cover photo URL (1 extra API call per new place, but only runs once at seed time)
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
          inserted++
          console.log(`    +ADDED: ${name}${coverPhotoUrl ? ' 📷' : ''}`)
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes('unique') || msg.includes('duplicate')) { skipped++ }
          else console.error(`    ERROR: ${name}: ${msg}`)
        }
      }

      await Bun.sleep(150) // avoid Google 429s
    }
  }

  console.log(`\n✓ Done. Inserted: ${inserted}, Skipped: ${skipped}`)
  console.log(`  Approximate API cost: ~$${((inserted + skipped) * 0.007 / 1000 + CITIES.length * CATEGORY_QUERIES.length * 0.017 / 1000 * 10).toFixed(2)} (rough estimate)`)
}

main().catch((err) => { console.error('Seed failed:', err); process.exit(1) })
