import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

await sql`ALTER TABLE spots ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0`
console.log('✓ spots.view_count added')

await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`
console.log('✓ reviews.updated_at added')

await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false`
console.log('✓ reviews.is_edited added')

console.log('Migration 0008 done.')
process.exit(0)
