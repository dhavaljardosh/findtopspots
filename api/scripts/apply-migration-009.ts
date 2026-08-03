import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

await sql`
  CREATE TABLE IF NOT EXISTS spot_views (
    spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    viewed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (spot_id, session_id, viewed_date)
  )
`
console.log('✓ spot_views table created')

await sql`CREATE INDEX IF NOT EXISTS spot_views_spot_date_idx ON spot_views(spot_id, viewed_date)`
console.log('✓ index created')

console.log('Migration 0009 done.')
process.exit(0)
