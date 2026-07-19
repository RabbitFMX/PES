# CLAUDE.md — PES backend

Standing context for working in `backend/`. See `../project-brief.md` for the
product (the data model is §13, the rate table §14), `../assignment/` for the
chunk-by-chunk build plan, and `../CLAUDE.md` for repo-wide engineering rules.

## Backend

The PES JSON API: a small Express + TypeScript server that sits between the
React client and Supabase Postgres. It owns the rules the frontend must not be
trusted with — points calculation (rate table, fenčí koeficient, elevation and
stroller bonuses), rankings, division standings and streaks — and exposes them
as `/api/*` endpoints. Supabase provides the database and Auth; this service
talks to it with the service-role key and validates every request and response
with Zod.

**Where it fits:** in Phase 1 the frontend runs entirely on its own mock layer
(`frontend/src/lib/mockApi.ts`). This backend implements the real endpoints
behind those mocks; chunk 12 swaps the frontend over to it. Each endpoint
returns the exact shape the corresponding mock already returns, so the swap is
a one-file change on the frontend.

## Tech stack

- **Runtime:** Node.js 24 LTS (installed on this server)
- **Framework:** Express 5
- **Language:** TypeScript (strict, `tsc --noEmit` for type-checking)
- **Validation:** Zod — request and response schemas, validated server-side
  before anything reaches the client
- **Database:** `@supabase/supabase-js` against Supabase (hosted Postgres +
  Auth). Migrations live in `../supabase/migrations` (chunk 3).
- **LLM:** the Anthropic SDK is installed (`src/llm/anthropicClient.ts`) but
  **deferred to seminar 6** — natural-language logging and the weekly recap.
  No route depends on it yet, and every AI path must keep a manual fallback.
- **Test runner:** Vitest + Supertest (HTTP/integration tests, colocated)
- **Linter:** ESLint (flat config, `typescript-eslint`)
- **Formatter:** Prettier (no semicolons, single quotes, width 100)
- **Package manager:** npm

## Commands

Run from `backend/`:

- Install: `npm install`
- Dev server: `npm run dev` (tsx watch; listens on `PORT`, default 3001)
- Test (once): `npm run test` · watch: `npm run test:watch`
- Lint: `npm run lint`
- Format: `npm run format` · check only: `npm run format:check`
- Type-check: `npm run typecheck`
- Production build: `npm run build` (tsc → `dist/`) · run it: `npm start`

Database (need `DATABASE_URL`, the Postgres connection string — see below):

- Apply migrations: `npm run db:migrate` (applies unapplied `supabase/migrations/*.sql`)
- Seed reference data: `npm run db:seed` (activities + round + weeks)
- Seed local demo members: `npm run db:seed:dev` (plain-Postgres/dev only)

Before committing, `npm run typecheck && npm run lint && npm run format:check && npm run test`
must all pass.

## Environment

Config comes from environment variables (see `.env.example`; real values in a
gitignored `.env`):

- `PORT` — port to listen on (default 3001)
- `CORS_ORIGIN` — allowed frontend origin (default `http://localhost:5173`)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` — Supabase
  (the app's runtime DB access goes through `@supabase/supabase-js`)
- `DATABASE_URL` — Postgres connection string, used **only** by the migrate/seed
  scripts (Supabase → Project Settings → Database; or any Postgres URL locally)
- `SIGNUP_INVITE_CODE` — shared code that gates public self-signup
  (`POST /api/signup`). Unset ⇒ self-signup is disabled (fails closed)
- `CONSENT_IP_SALT` — secret salt for hashing client IPs in the GDPR consent
  log (`POST /api/consent`). Only the hash is stored (data minimisation), never
  the raw IP. A non-secret dev default is used if unset — set a real value in prod.
- `ANTHROPIC_API_KEY` — present but unused until seminar 6

## API structure

Base path is `/api`, wired in `src/app.ts` (order: `express.json()` → CORS →
resource routers → error handler last). The layers:

- `src/routes/` — one router file per resource; thin HTTP glue only
- `src/services/` — business logic (points calc, rankings, streaks); no HTTP
- `src/schemas/` — Zod request/response schemas
- `src/db/` — Supabase client, typed row types (`types.ts`), per-table query
  helpers (e.g. `activities.ts`), and the `migrate.ts` / `seed.ts` runners.
  Keep raw SQL/queries here, never in routes.
- `src/middleware/` — auth guard, the central error handler, and the test-data toggle
- `src/testData/` — deterministic test-data generator + the request-scoped flag
- `src/llm/` — Claude Haiku client + `log_activities` tool def (seminar 6)

### Test-data mode

A read-only testing aid for exercising the detail-heavy stats/overview/pack
screens (imported history is weekly totals only, so per-activity detail is
otherwise empty). When a request carries `X-PES-Test-Data: 1`,
`middleware/testMode.ts` runs the handler inside an AsyncLocalStorage context
(`testData/context.ts`), and the two DETAILED readers in `db/logEntries.ts`
(`listMemberEntriesDetailed`, `listDetailedActivityPoints`) return
DETERMINISTICALLY GENERATED per-activity data (`testData/generator.ts`) instead
of the sparse real rows. Generation preserves each member's real per-week /
lifetime totals EXACTLY (only the breakdown is synthesized), so points, ranks,
streaks and leaderboards are unchanged — only the per-activity/day charts fill
in. Nothing is written; turning the header off restores real data next request.
The frontend toggle lives in Profile (`frontend/src/lib/testData.ts`).

### Authentication & guards

The client logs in with Supabase Auth (email+password) and sends the JWT as
`Authorization: Bearer <jwt>`. `src/middleware/auth.ts` provides:

- `requireAuth()` — verifies the JWT with Supabase (`auth.getUser`), resolves it
  to a `member` row (`member.id === auth.users` id) and attaches `req.member`
  (typed `AuthedRequest`). Missing/invalid token → **401**; valid token but no
  member row → **403 `not_a_member`** (invite-only, no auto-provisioning, §11).
- `requireAdmin` — after `requireAuth`, rejects non-admins with **403**. A direct
  hit on an admin route by a member is rejected, not just hidden.
- `mountProtected(app, path, router, { admin?, deps? })` — mounts a router behind
  the guards. `deps` injects the Supabase/member lookups so tests drive the
  middleware without a live Supabase (mock `verifyToken`).

Public routes (e.g. `/api/health`) are mounted directly; everything else goes
through `mountProtected`. `optionalAuth()` is a non-rejecting variant for routes
that serve both anonymous and logged-in callers (the consent endpoint): it
attaches `req.member` when a valid token is present and otherwise continues.
`createApp` sets `trust proxy` so `req.ip` reflects the real client behind Traefik.

**Planned endpoints** (built across the later chunks; ticked = live):

- `GET /api/health` — liveness ✅ (chunk 1)
- `POST /api/signup` — **public** self-signup, gated by `SIGNUP_INVITE_CODE`;
  creates the Supabase Auth user (password, email pre-confirmed) + a `member`
  row (role `member`, division B). The only path that provisions a member
  without an admin; `requireAuth` stays invite-only. ✅
- `POST /api/consent` — **public** (opportunistic auth) GDPR consent write.
  Records one immutable `consent_log` row per category (analytics/marketing) with
  the member (if signed in), a **hashed** IP, timestamp, category, granted flag,
  and the policy version+hash; for a signed-in member it also updates the
  `member.{analytics,marketing}_consent` flags. Backs the cookie banner and the
  profile Privacy toggles. ✅
- `GET /api/me` — the current member's profile (now includes
  `analyticsConsent`/`marketingConsent`) ✅ (chunk 4)
- `PATCH /api/me` — the member updates their OWN name / avatar / language / theme
  (self-only; avatar carries a `dog:<style>:<color>:<size>` token or a URL) ✅
- `GET /api/members` — members directory (view-others), ranked by lifetime points ✅
- `GET /api/members/:id/overview` — any member's personal overview (read-only):
  weekly snapshot + this-week activity detail, records (now incl.
  `weeksBelowGoal`, `weeksLogged`, `avgWeeklyPoints`), `bestWeekDetail`
  (points + which round/week + its activity split), `pointsByActivity` (all
  lifetime points split by activity incl. a quick-add bucket, for the pie),
  top-10 `topActivities`, per-round history, cumulative distance/elevation ✅
- `GET /api/pack-stats` — whole-pack comparison (Statistiky): all-time ranking,
  per-round group totals + winners, per-member×round matrix ✅
- `GET /api/pack-weekly?roundId=…` — per-week per-member points for one round
  (defaults to the open/most-recent round); backs the compare-members-by-week
  chart ✅
- `GET /api/activities` — active rate table for the log-activity screen ✅ (chunk 5)
- `POST /api/log-entries/preview` — compute points for an entry, no write ✅ (chunk 6)
- `POST /api/log-entries` — commit a log entry ✅ (chunk 6)
- `POST /api/log-entries/parse` — LLM natural-language → structured preview;
  **deferred to seminar 6** — returns `501 not_implemented` (stub, no LLM call)
- `GET /api/dashboard` — personal dashboard: weekly progress, streak ✅ (chunk 7)
- `GET /api/leaderboard` — live standings across both divisions ✅ (chunk 8)
- `GET /api/stats` — personal stats and history ✅ (chunk 9)
- `GET /api/challenges/current` · `GET /api/challenges/past` · `POST /api/challenges` · `POST /api/challenges/:id/submissions` ✅ (chunk 10)
- Admin (`GET /api/admin/...`, admin-only) ✅ (chunk 11): every mutating admin
  endpoint returns the uniform `{ ok: true } | { ok: false, message }`
  (validation failures included, so the frontend toasts them without a throw);
  the whole admin router is mounted once behind `requireAdmin`.
  - members: `GET /api/admin/members`, `POST /api/admin/members/invite`, `PATCH /api/admin/members/:id`, `POST /api/admin/members/merge` (fold a historical member into a real account)
  - activities: `GET /api/admin/activities`, `POST /api/admin/activities`, `PATCH /api/admin/activities/:id`
  - rounds: `GET /api/admin/rounds`, `POST /api/admin/rounds`, `PATCH /api/admin/rounds/:id`, `GET /api/admin/rounds/:id/export` (streams an `.xlsx` of the round in the legacy `PES 2.0.xlsx` round-sheet layout — pack labels, `týden` rows, per-member weekly totals — so it continues the original workbook; built with `exceljs` in `services/roundExport.ts`)
  - challenge rotation: `GET /api/admin/rotation`, `PUT /api/admin/rotation`

A weekly-status endpoint for the n8n nudge workflow (brief §20) is planned but
not yet scoped into a chunk.

## Database schema

The full model is brief §13. The SQL lives in `../supabase/migrations`
(`20260714120000_init_schema.sql`, then `20260714130000_log_entry_quickadd.sql`
which makes `log_entry.activity_id` nullable for quick-add entries, then
`20260715120000_challenge_bonus_split.sql` which adds the optional
`challenge.bonus_split` custom placement points, then
`20260715130000_round_upcoming_status.sql` which lets `round.status` be
`upcoming` (admin creates the next round before it opens), then
`20260715140000_set_challenge_rotation_fn.sql` which adds an atomic
`set_challenge_rotation(uuid[])` function for the rotation PUT), then
`20260716120000_history_import_support.sql` (historical import + `member_round_bank`),
then `20260717120000_gdpr_consent.sql` (GDPR consent: `analytics_consent` /
`marketing_consent` columns on `member`, both default false, plus the
`consent_log` audit table) and reference data in `../supabase/seed.sql`;
apply both with `npm run db:migrate && npm run db:seed`. **Keep this section in
sync as new migrations land.** Tables are snake_case
(`member`, `activity`, `round`, `week`, `log_entry`, `challenge`,
`challenge_submission`, `challenge_rotation`, `member_round_division`,
`member_round_bank`, `consent_log`).

Key modeling decisions:

- **`member.id` IS the Supabase `auth.users` UUID** — an authenticated request
  maps straight to a member row. There is **no `password_hash` column**:
  Supabase Auth owns credentials (§11/§25). The FK to `auth.users` is added by
  the migration only when that schema exists, so migrations also apply to a
  plain Postgres DB (used for local/CI verification).
- **`activity.id` is a text slug** (`run`, `hike`, …) matching the frontend rate
  table, so the frontend↔API swap in chunk 12 is clean.
- Rep/strength activities encode the block size in `unit` (e.g. `'10 reps'`)
  with `points_per_unit = 1`; tiered activities use `unit = 'pts'`,
  `points_per_unit = 0`, and a `tier_options` array (the logged quantity is the
  chosen preset value). Seed covers all 35 activities of §14.

Entities:

- **Member** — a person: identity, `gender`, `coefficient` (1.0 or 1.25 — the
  fenčí koeficient), current `division` (A/B), `role`, `status`, prefs, and
  `injury_exempt_until` (illness/injury exemption the weekly nudge skips).
- **Activity** — a row of the rate table (§14): CS/EN names, `unit`,
  `points_per_unit`, per-activity elevation and stroller bonuses (additive
  bonuses and, separately, `stroller_base_rate_override` for activities whose
  base rate changes with a stroller), and `is_tiered` + `tier_options` (JSON)
  for preset-dropdown activities.
- **Round** — a half-year competition period (`start_date`, `end_date`,
  `status` — `upcoming` / `open` / `closed`; opening/closing is a manual admin
  action for MVP).
- **Week** — a week within a round (`round_id`, `week_number`, dates); the unit
  the 100-point goal is measured against.
- **LogEntry** — one logged activity: `member_id`, `week_id`, `activity_id`,
  `activity_date`, `quantity`, `elevation_m`, `with_stroller`, plus `raw_points`
  and `final_points` kept separate (so "24 ×1.25 = 30" is shown transparently),
  `source` (manual / quick-add / llm), and `note`. `activity_id` is **null for
  quick-add** entries (raw point totals for edge cases with no rate-table
  activity, brief §22); detailed/LLM entries reference a real activity. Points
  are always computed server-side in `services/points.ts` — the client value is
  never trusted. Every entry is assigned to the currently open `week`
  (`services/logEntries.ts`); a date outside it is rejected (400).
- **Challenge** — a weekly challenge: `week_id`, `setter_member_id`, `title`,
  `description`, `deadline`, `status`, and an optional `bonus_split` (custom
  placement points; null → the default 30/20/10 in `services/challenges.ts`).
  Ranks/bonuses are computed from submissions (ties split a placement's points
  evenly, §15/§22); the current setter is decided by `challenge_rotation`
  advanced one slot per challenge created.
- **ChallengeSubmission** — a member's entry to a challenge: `value`, `rank`,
  `bonus_points`. Unique `(challenge_id, member_id)` → one award per member;
  submitting upserts the latest value and recomputes every rank/bonus.
- **ChallengeRotation** — the admin-defined order for who sets the next
  challenge (`member_id`, `order_position`).
- **MemberRoundDivision** — which division a member was in for a given past
  round, so "best round finish" reflects their division at the time.
- **ConsentLog** — immutable GDPR consent audit trail (`services/consent.ts`,
  `db/consent.ts`): one append-only row per category decision (grant OR
  withdrawal) with `member_id` (nullable — anonymous pre-login is allowed),
  `ip_hash` (sha256 of IP + `CONSENT_IP_SALT`; the raw IP is never stored),
  `consent_type`, `granted`, `policy_version`, `policy_hash`, `user_agent`,
  `created_at`. The member's _current_ consent is denormalised onto
  `member.{analytics,marketing}_consent` so processing can be gated cheaply —
  e.g. `weeklyNudgeRecipients` in `services/notifications.ts` drops members
  without marketing consent, so consent gates email sending, not just scripts.

Divisions, standings, promotion/relegation, dropped-worst-3 and the PSA-držák
bonus are **computed at query time in `src/services`**, not stored as columns.

## How to add an endpoint

The concrete recipe (TDD — write the test first):

1. **Schema** — add/extend a Zod schema in `src/schemas/` for the request body
   and/or response shape. Match the shape the frontend mock already returns.
2. **Route** — add a handler to the resource's router in `src/routes/` (create
   `src/routes/<resource>.ts` if the resource is new). Keep it thin: parse and
   validate with the schema, call a service, send the result.
3. **Logic** — put the real work in a function in `src/services/`. Services
   contain no Express types; they take plain inputs and return plain data so
   they are unit-testable.
4. **Mount** — mount the router under `/api` in `src/app.ts` (before the error
   handler). Guard it with the auth middleware; admin routes also need the
   admin check.
5. **Test** — add a colocated Supertest test (`src/routes/<resource>.test.ts`)
   covering success and the failure paths (401 unauthenticated, 400 invalid
   body). Unit-test non-trivial service logic separately.
6. **Document** — update this file (the endpoint list above, and the schema
   section if the data model changed).

## The rule

**When you add a feature or endpoint or change the structure, update this
file** — the API-structure endpoint list, the database-schema summary, or the
commands, whichever changed. The context files are the map newcomers read
before the code.
