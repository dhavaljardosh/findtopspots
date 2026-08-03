/**
 * Make a user admin. Run once to bootstrap.
 * Usage:
 *   bun run scripts/make-admin.ts                    — makes most recent user admin
 *   bun run scripts/make-admin.ts user@example.com   — makes user with that username admin
 *   bun run scripts/make-admin.ts user_clerkId123    — makes user with that Clerk ID admin
 */

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq, desc } from 'drizzle-orm'
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

const arg = process.argv[2]

let user: typeof schema.users.$inferSelect | undefined

if (!arg) {
  // Most recently signed-up user
  user = await db.query.users.findFirst({
    where: eq(schema.users.isAdmin, false),
    orderBy: [desc(schema.users.createdAt)],
  })
  console.log('No argument provided — targeting most recent non-admin user')
} else if (arg.startsWith('user_') || arg.startsWith('clerk_')) {
  user = await db.query.users.findFirst({ where: eq(schema.users.clerkId, arg) })
} else {
  user = await db.query.users.findFirst({ where: eq(schema.users.username, arg) })
}

if (!user) {
  // List all users to help identify
  const all = await db.query.users.findMany({ orderBy: [desc(schema.users.createdAt)], limit: 10 })
  console.error('User not found. Available users:')
  for (const u of all) {
    console.log(`  ${u.username} | clerkId: ${u.clerkId} | admin: ${u.isAdmin}`)
  }
  process.exit(1)
}

const [updated] = await db
  .update(schema.users)
  .set({ isAdmin: true })
  .where(eq(schema.users.id, user.id))
  .returning()

console.log(`✓ Made admin: ${updated?.username} (${updated?.clerkId})`)
console.log(`  Visit https://findtopspots.com/admin to access the admin panel`)
