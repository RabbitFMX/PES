/**
 * Migration runner. We use this instead of the Supabase CLI (not installed on
 * this server). It applies every `supabase/migrations/*.sql` file that has not
 * yet been applied, in filename order, each inside its own transaction, and
 * records applied files in a `schema_migrations` table so re-runs are no-ops.
 *
 * Usage (from backend/):  DATABASE_URL=postgres://… npm run db:migrate
 * DATABASE_URL is the Supabase Postgres connection string (Project Settings →
 * Database), or any Postgres URL for local/CI verification.
 */
import 'dotenv/config'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Client } from 'pg'

const MIGRATIONS_DIR = resolve(__dirname, '../../../supabase/migrations')

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is required to run migrations (the Supabase Postgres connection string).',
    )
  }

  const client = new Client({ connectionString })
  await client.connect()
  try {
    await client.query(`create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )`)

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort()
    const { rows } = await client.query<{ filename: string }>(
      'select filename from schema_migrations',
    )
    const applied = new Set(rows.map((r) => r.filename))

    let count = 0
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip  ${file} (already applied)`)
        continue
      }
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
      console.log(`apply ${file}`)
      await client.query('begin')
      try {
        await client.query(sql)
        await client.query('insert into schema_migrations (filename) values ($1)', [file])
        await client.query('commit')
        count++
      } catch (err) {
        await client.query('rollback')
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`, { cause: err })
      }
    }

    console.log(count === 0 ? 'Database already up to date.' : `Applied ${count} migration(s).`)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
