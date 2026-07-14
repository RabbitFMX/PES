/**
 * Seed runner (pairs with migrate.ts). Runs a Supabase seed SQL file against
 * DATABASE_URL. Both seed files are idempotent.
 *
 * Usage (from backend/):
 *   DATABASE_URL=postgres://… npm run db:seed        # supabase/seed.sql (reference data)
 *   DATABASE_URL=postgres://… npm run db:seed:dev    # supabase/seed_dev.sql (local demo members)
 */
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Client } from 'pg'

const SUPABASE_DIR = resolve(__dirname, '../../../supabase')

async function main(): Promise<void> {
  const dev = process.argv.includes('--dev')
  const filename = dev ? 'seed_dev.sql' : 'seed.sql'

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to seed the database.')
  }

  const client = new Client({ connectionString })
  await client.connect()
  try {
    const sql = readFileSync(resolve(SUPABASE_DIR, filename), 'utf8')
    await client.query(sql)
    console.log(`Seeded from ${filename}.`)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
