# Chunk 3 — Database schema & migrations (+ seed the rate table)

## Description

Implement the PES data model (project-brief §13) as SQL migrations against
Supabase Postgres, and seed the reference data every feature depends on: the
35-row activity rate table (§14), one open round, and its weeks. This is the
foundation for every API endpoint chunk.

## Exactly what to do

1. Add a migration tool. Simplest: a `supabase/migrations/` folder with
   timestamped `.sql` files applied via the Supabase CLI (or a small
   `node-postgres`-based runner script `backend/src/db/migrate.ts` if the CLI
   is not available). Document the apply command in `backend/CLAUDE.md`.
2. Create the schema exactly per §13 (snake_case Postgres columns):
   `member`, `activity`, `round`, `week`, `log_entry`, `challenge`,
   `challenge_submission`, `challenge_rotation`, `member_round_division`.
   - `member.coefficient` (1.0 / 1.25), `division` ('A'/'B'), `role`
     ('member'/'admin'), `status` ('active'/'left'), `injury_exempt_until` date.
   - `activity`: `name_cs`, `name_en`, `unit`, `points_per_unit`,
     `has_elevation_bonus`, `elevation_bonus_per_50m`,
     `elevation_bonus_per_50m_stroller`, `stroller_base_rate_override`,
     `is_tiered`, `tier_options` (jsonb), `notes`, `active`.
   - `log_entry`: `raw_points`, `final_points`, `source`
     ('manual'/'quick-add'/'llm'), `activity_date`, `created_at`, `elevation_m`,
     `with_stroller`, `quantity`, `unit`, FK to `member`/`week`/`activity`.
   - Add sensible constraints (FKs, not-null, checks on enums) and indexes on
     the columns endpoints will filter by (`log_entry.member_id`,
     `log_entry.week_id`, `week.round_id`).
3. Link identity to Supabase Auth: `member.id` is the Supabase `auth.users` UUID
   (so an authenticated request maps to a member row). Document this.
4. Seed data:
   - All 35 activities from §14 with correct rates, elevation/stroller fields,
     and `tier_options` for the tiered rows. For běžky (§26) seed the ambiguous
     stroller rate with an admin-visible `notes` flag.
   - One `round` with `status = 'open'` and its `week` rows.
   - Do **not** auto-create an admin — first admin is set manually in Supabase
     (§25). Optionally seed a couple of demo members for local testing behind a
     clearly separate `seed_dev.sql`.
5. Add a typed DB access layer in `backend/src/db/` (query helpers or a thin
   repository per table) that later chunks reuse. Keep raw SQL/queries here, not
   in routes.

## Files it creates or changes

- `supabase/migrations/*.sql` (schema)
- `supabase/seed.sql` (activities + round + weeks) and optional
  `supabase/seed_dev.sql`
- `backend/src/db/migrate.ts` (only if not using the Supabase CLI)
- `backend/src/db/*.ts` (query helpers / repositories)
- `backend/CLAUDE.md` (schema + migrate/seed commands — update)

## How to verify

- Migrations apply cleanly to a fresh database with no errors.
- `SELECT count(*) FROM activity` returns 35; tiered rows have non-empty
  `tier_options`.
- A unit test for a repository helper (e.g. "list active activities") passes
  against a test database or a mocked client.
- `npm run typecheck` / `lint` / `test` clean.

## Dependencies

Chunks 1–2. Requires Supabase project credentials in `backend/.env`
(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

## Follow the repo rules

Test-driven where it makes sense (test the query helpers), keep lint/format/
type-check clean, Conventional Commits (`feat:`), and update `backend/CLAUDE.md`
with the final schema + how to run migrations/seed.

Commit and push.
