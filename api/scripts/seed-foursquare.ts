/**
 * Seed spots from Foursquare Places API (free tier: 1,000 calls/day).
 * Does NOT call Google — zero Google API cost.
 * Run: bun run seed:foursquare
 *
 * Requires DATABASE_URL and FOURSQUARE_API_KEY in .env
 * Foursquare photos are fetched via their own CDN (free).
 *
 * Strategy:
 *   - 32 cities × 6 category groups = 192 calls/run (~$0)
 *   - Spread over multiple days to stay under 1k/day free limit
 *   - Pass --city=Austin to seed only one city
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

const FSQ_API_KEY = process.env.FOURSQUARE_API_KEY
const DATABASE_URL = process.env.DATABASE_URL

if (!FSQ_API_KEY) { console.error('Missing FOURSQUARE_API_KEY'); process.exit(1) }
if (!DATABASE_URL) { console.error('Missing DATABASE_URL'); process.exit(1) }

const sql = neon(DATABASE_URL)
const db = drizzle(sql, { schema })

// CLI: --city=Austin to seed only that city
const cityArg = process.argv.find((a) => a.startsWith('--city='))?.split('=')[1]

// ─── Foursquare category IDs ──────────────────────────────────────────────────
// https://docs.foursquare.com/data-products/docs/categories

const FSQ_CATEGORIES: Array<{
  ids: string[]
  category: schema.spotCategoryEnum['enumValues'][number]
  label: string
}> = [
  {
    ids: ['13065', '13002', '13003', '13276'],  // Dining, American, Asian, Indian
    category: 'restaurant',
    label: 'Restaurants',
  },
  {
    ids: ['13032', '13034', '13035'],             // Coffee, Tea, Cafe
    category: 'cafe',
    label: 'Cafes & Coffee',
  },
  {
    ids: ['13003', '13029', '13031'],             // Bar, Beer Bar, Cocktail Bar
    category: 'bar',
    label: 'Bars & Nightlife',
  },
  {
    ids: ['16032', '16019', '16011'],             // Park, Nature, Outdoor
    category: 'park',
    label: 'Parks & Outdoors',
  },
  {
    ids: ['18021', '18011'],                       // Gym, Yoga
    category: 'gym',
    label: 'Fitness',
  },
  {
    ids: ['10000', '10027', '10028'],              // Arts & Entertainment, Museum, Theater
    category: 'attraction',
    label: 'Attractions',
  },
  {
    ids: ['17000', '17069', '17114'],              // Shopping, Boutique, Mall
    category: 'shop',
    label: 'Shopping',
  },
]

// ─── Cities ───────────────────────────────────────────────────────────────────

const CITIES: Array<{ name: string; state: string; lat: number; lng: number }> = [
  { name: 'Austin',        state: 'TX', lat: 30.2672,  lng: -97.7431 },
  { name: 'San Antonio',   state: 'TX', lat: 29.4241,  lng: -98.4936 },
  { name: 'Houston',       state: 'TX', lat: 29.7604,  lng: -95.3698 },
  { name: 'Dallas',        state: 'TX', lat: 32.7767,  lng: -96.7970 },
  { name: 'Fort Worth',    state: 'TX', lat: 32.7555,  lng: -97.3308 },
  { name: 'El Paso',       state: 'TX', lat: 31.7619,  lng: -106.4850 },
  { name: 'Corpus Christi',state: 'TX', lat: 27.8006,  lng: -97.3964 },
  { name: 'Lubbock',       state: 'TX', lat: 33.5779,  lng: -101.8552 },
  { name: 'Amarillo',      state: 'TX', lat: 35.2220,  lng: -101.8313 },
  { name: 'McAllen',       state: 'TX', lat: 26.2034,  lng: -98.2300 },
  { name: 'Waco',          state: 'TX', lat: 31.5493,  lng: -97.1467 },
  { name: 'Midland',       state: 'TX', lat: 31.9974,  lng: -102.0779 },
  { name: 'Abilene',       state: 'TX', lat: 32.4487,  lng: -99.7331 },
  { name: 'Round Rock',    state: 'TX', lat: 30.5083,  lng: -97.6789 },
  { name: 'San Marcos',    state: 'TX', lat: 29.8833,  lng: -97.9414 },
  { name: 'New Braunfels', state: 'TX', lat: 29.7030,  lng: -98.1245 },
  { name: 'Georgetown',    state: 'TX', lat: 30.6333,  lng: -97.6775 },
  { name: 'Galveston',     state: 'TX', lat: 29.3013,  lng: -94.7977 },
]

// ─── Foursquare API helpers ───────────────────────────────────────────────────

interface FsqPlace {
  fsq_id: string
  name: string
  location?: {
    formatted_address?: string
    address?: string
    locality?: string
    region?: string
  }
  geocodes?: {
    main?: { latitude?: number; longitude?: number }
  }
  categories?: Array<{ id: number; name: string }>
  photos?: Array<{ prefix?: string; suffix?: string }>
  rating?: number
  description?: string
}

async function searchFoursquare(
  categoryIds: string[],
  lat: number,
  lng: number,
): Promise<FsqPlace[]> {
  const params = new URLSearchParams({
    ll: `${lat},${lng}`,
    categories: categoryIds.join(','),
    limit: '50',
    radius: '15000',
    fields: 'fsq_id,name,location,geocodes,categories,photos,rating,description',
    sort: 'RATING',
  })

  const res = await fetch(`https://api.foursquare.com/v3/places/search?${params}`, {
    headers: {
      Authorization: FSQ_API_KEY!,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    console.warn(`  Foursquare search failed: ${res.status} ${res.statusText}`)
    return []
  }

  const data = (await res.json()) as { results?: FsqPlace[] }
  return data.results ?? []
}

function getFsqPhotoUrl(place: FsqPlace): string | null {
  const photo = place.photos?.[0]
  if (!photo?.prefix || !photo?.suffix) return null
  return `${photo.prefix}800x600${photo.suffix}`
}

function getAddress(place: FsqPlace, cityName: string, stateName: string): string {
  const loc = place.location
  if (loc?.formatted_address) return loc.formatted_address
  if (loc?.address && loc?.locality) return `${loc.address}, ${loc.locality}, ${stateName}`
  return `${cityName}, ${stateName}`
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
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
  }

  // Load existing Foursquare IDs to skip duplicates
  const existingRows = await db
    .select({ foursquareId: schema.spots.foursquareId })
    .from(schema.spots)
  const existingFsqIds = new Set(existingRows.map((s) => s.foursquareId).filter(Boolean))
  console.log(`Existing spots with Foursquare IDs: ${existingFsqIds.size}\n`)

  const cities = cityArg
    ? CITIES.filter((c) => c.name.toLowerCase() === cityArg.toLowerCase())
    : CITIES

  if (cities.length === 0) {
    console.error(`City "${cityArg}" not found in city list`)
    process.exit(1)
  }

  let inserted = 0
  let skipped = 0
  let apiCalls = 0

  for (const city of cities) {
    console.log(`\n═══ ${city.name}, ${city.state} ═══`)

    for (const catGroup of FSQ_CATEGORIES) {
      console.log(`  [${catGroup.label}]`)
      apiCalls++

      const places = await searchFoursquare(catGroup.ids, city.lat, city.lng)

      for (const place of places) {
        if (!place.fsq_id || !place.geocodes?.main?.latitude || !place.geocodes?.main?.longitude) {
          skipped++
          continue
        }
        if (existingFsqIds.has(place.fsq_id)) {
          skipped++
          continue
        }

        const name = place.name
        if (!name) { skipped++; continue }

        const address = getAddress(place, city.name, city.state)
        const description =
          place.description ??
          `${name} is a popular ${catGroup.category} in ${city.name}, ${city.state}.`
        const coverPhotoUrl = getFsqPhotoUrl(place)

        try {
          await db.insert(schema.spots).values({
            name,
            description,
            category: catGroup.category,
            lat: place.geocodes.main.latitude,
            lng: place.geocodes.main.longitude,
            address,
            createdBy: userId,
            foursquareId: place.fsq_id,
            coverPhotoUrl,
            featuredBy: 'foursquare_seed',
          })

          existingFsqIds.add(place.fsq_id)
          inserted++
          console.log(`    +ADDED: ${name}${coverPhotoUrl ? ' 📷' : ''}`)
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes('unique') || msg.includes('duplicate')) { skipped++ }
          else console.error(`    ERROR: ${name}: ${msg}`)
        }
      }

      await Bun.sleep(100) // stay well under rate limits
    }
  }

  console.log(`\n✓ Done. Inserted: ${inserted}, Skipped: ${skipped}, API calls: ${apiCalls}`)
  console.log(`  Foursquare calls used: ${apiCalls} / 1000 daily free limit`)
}

main().catch((err) => { console.error('Seed failed:', err); process.exit(1) })
