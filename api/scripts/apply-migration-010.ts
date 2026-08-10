import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`
console.log('✓ pg_trgm extension enabled')

await sql`CREATE INDEX IF NOT EXISTS spots_name_trgm_idx ON spots USING GIN (name gin_trgm_ops)`
console.log('✓ trigram index on spots.name')

await sql`CREATE INDEX IF NOT EXISTS spots_address_trgm_idx ON spots USING GIN (address gin_trgm_ops)`
console.log('✓ trigram index on spots.address')

console.log('Migration 0010 done.')
process.exit(0)
