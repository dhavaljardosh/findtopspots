/**
 * Seed spots from OpenStreetMap via Overpass API.
 * Completely free — no API key required.
 * Run: bun run seed:osm
 *
 * Requires only DATABASE_URL in .env
 *
 * OSM data quality note:
 *   - Great for parks, gyms, attractions, shops
 *   - Many places lack photos — coverPhotoUrl will be null
 *   - Address data can be sparse; falls back to city name
 *
 * Strategy:
 *   - Query each city for each amenity type
 *   - Only insert spots with a name
 *   - Skips duplicates by OSM node ID stored in description
 */

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq, like } from 'drizzle-orm'
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

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) { console.error('Missing DATABASE_URL'); process.exit(1) }

const sql = neon(DATABASE_URL)
const db = drizzle(sql, { schema })

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

// ─── Cities ───────────────────────────────────────────────────────────────────

const CITIES: Array<{ name: string; state: string; lat: number; lng: number; radius: number }> = [
  { name: 'Austin',        state: 'TX', lat: 30.2672,  lng: -97.7431,  radius: 15000 },
  { name: 'San Antonio',   state: 'TX', lat: 29.4241,  lng: -98.4936,  radius: 15000 },
  { name: 'Houston',       state: 'TX', lat: 29.7604,  lng: -95.3698,  radius: 15000 },
  { name: 'Dallas',        state: 'TX', lat: 32.7767,  lng: -96.7970,  radius: 12000 },
  { name: 'Fort Worth',    state: 'TX', lat: 32.7555,  lng: -97.3308,  radius: 12000 },
  { name: 'Round Rock',    state: 'TX', lat: 30.5083,  lng: -97.6789,  radius: 8000  },
  { name: 'San Marcos',    state: 'TX', lat: 29.8833,  lng: -97.9414,  radius: 6000  },
  { name: 'New Braunfels', state: 'TX', lat: 29.7030,  lng: -98.1245,  radius: 6000  },
  { name: 'Waco',          state: 'TX', lat: 31.5493,  lng: -97.1467,  radius: 8000  },
  { name: 'Galveston',     state: 'TX', lat: 29.3013,  lng: -94.7977,  radius: 6000  },
]

// ─── OSM amenity → our category mapping ──────────────────────────────────────

const OSM_QUERIES: Array<{
  amenity: string
  category: schema.spotCategoryEnum['enumValues'][number]
  tags?: Record<string, string>
}> = [
  { amenity: 'restaurant',  category: 'restaurant' },
  { amenity: 'cafe',        category: 'cafe' },
  { amenity: 'bar',         category: 'bar' },
  { amenity: 'pub',         category: 'bar' },
  { amenity: 'fast_food',   category: 'restaurant' },
  { amenity: 'ice_cream',   category: 'restaurant' },
  { amenity: 'park',        category: 'park' },
  { amenity: 'fitness_centre', category: 'gym' },
  { amenity: 'gym',         category: 'gym' },
  { amenity: 'museum',      category: 'attraction' },
  { amenity: 'theatre',     category: 'attraction' },
  { amenity: 'cinema',      category: 'attraction' },
]

// ─── Overpass API ─────────────────────────────────────────────────────────────

interface OsmNode {
  type: 'node'
  id: number
  lat: number
  lon: number
  tags?: Record<string, string>
}

async function queryOverpass(
  amenity: string,
  lat: number,
  lng: number,
  radius: number,
): Promise<OsmNode[]> {
  // Separate queries for nodes vs ways (ways need center output to get a point)
  const query = `[out:json][timeout:25];(node["amenity"="${amenity}"](around:${radius},${lat},${lng});way["amenity"="${amenity}"](around:${radius},${lat},${lng}););out center;`

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: `data=${encodeURIComponent(query)}`,
    })

    if (!res.ok) {
      console.warn(`  Overpass failed for ${amenity}: ${res.status}`)
      return []
    }

    const data = (await res.json()) as {
      elements?: Array<OsmNode | { type: 'way'; id: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }>
    }

    // Normalize ways (use center point) to same shape as nodes
    return (data.elements ?? []).map((el) => {
      if (el.type === 'way') {
        return {
          type: 'node' as const,
          id: el.id,
          lat: el.center?.lat ?? 0,
          lon: el.center?.lon ?? 0,
          tags: el.tags,
        }
      }
      return el as OsmNode
    }).filter((el) => el.lat !== 0 && el.lon !== 0)
  } catch (err) {
    console.warn(`  Overpass error for ${amenity}:`, err)
    return []
  }
}

function buildAddress(tags: Record<string, string> | undefined, cityName: string, stateName: string): string {
  if (!tags) return `${cityName}, ${stateName}`
  const parts: string[] = []
  if (tags['addr:housenumber'] && tags['addr:street']) {
    parts.push(`${tags['addr:housenumber']} ${tags['addr:street']}`)
  } else if (tags['addr:street']) {
    parts.push(tags['addr:street'])
  }
  parts.push(tags['addr:city'] ?? cityName)
  if (tags['addr:state']) parts.push(tags['addr:state'])
  else parts.push(stateName)
  return parts.join(', ')
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

  // Track inserted OSM node IDs via featuredBy field
  const existingOsmRows = await db
    .select({ featuredBy: schema.spots.featuredBy })
    .from(schema.spots)
    .where(like(schema.spots.featuredBy, 'osm:%'))
  const existingOsmIds = new Set(existingOsmRows.map((r) => r.featuredBy).filter(Boolean))
  console.log(`Existing OSM spots: ${existingOsmIds.size}\n`)

  let inserted = 0
  let skipped = 0

  for (const city of CITIES) {
    console.log(`\n═══ ${city.name}, ${city.state} ═══`)

    for (const { amenity, category } of OSM_QUERIES) {
      const nodes = await queryOverpass(amenity, city.lat, city.lng, city.radius)
      console.log(`  [${amenity}] → ${nodes.length} results`)

      for (const node of nodes) {
        const name = node.tags?.name
        if (!name) { skipped++; continue }

        const osmKey = `osm:${node.id}`
        if (existingOsmIds.has(osmKey)) { skipped++; continue }

        const address = buildAddress(node.tags, city.name, city.state)
        const cuisine = node.tags?.cuisine ?? node.tags?.['addr:city'] ?? ''
        const description = `${name} is a ${cuisine ? cuisine + ' ' : ''}${amenity.replace('_', ' ')} in ${city.name}, ${city.state}.`

        try {
          await db.insert(schema.spots).values({
            name,
            description,
            category,
            lat: node.lat,
            lng: node.lon,
            address,
            createdBy: userId,
            coverPhotoUrl: null,
            featuredBy: osmKey,
          })

          existingOsmIds.add(osmKey)
          inserted++
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes('unique') || msg.includes('duplicate')) { skipped++ }
          else console.error(`    ERROR: ${name}: ${msg}`)
        }
      }

      await Bun.sleep(1000) // Overpass asks for ≥1s between requests
    }
  }

  console.log(`\n✓ Done. Inserted: ${inserted}, Skipped: ${skipped}`)
  console.log('  Cost: $0.00 (OpenStreetMap is free)')
}

main().catch((err) => { console.error('OSM seed failed:', err); process.exit(1) })
