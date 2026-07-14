# Chunk 2 — Project context files

## Description

Make the standing context files describe the whole project. The root
`CLAUDE.md` and `frontend/CLAUDE.md` already exist; **update** the root one to
cover both apps, and **create** `backend/CLAUDE.md`.

## Exactly what to do

1. **Update `CLAUDE.md` (repo root)** so it documents the project as two apps:
   - One-paragraph project summary (private, invite-only PES tracker).
   - A "Two apps" section pointing to `frontend/` (React SPA, see
     `frontend/CLAUDE.md`) and `backend/` (Express API, see
     `backend/CLAUDE.md`), plus Supabase (Postgres + Auth) as the datastore.
   - Repo-wide engineering rules (already present): TDD, lint/format/type-check
     clean before commit, Conventional Commits, small commits, secrets never
     committed.
   - Keep the existing frontend structure section; add a short backend pointer.
   - Add/keep the rule: **when you add a feature, endpoint, or change structure,
     update the relevant `CLAUDE.md`** (root, `frontend/`, or `backend/`).

2. **Create `backend/CLAUDE.md`** with these sections:
   - **Backend** — what it is (the PES JSON API over Supabase Postgres) and how
     it fits.
   - **Tech stack** — Node 24, Express, TypeScript (strict), Zod validation,
     `@supabase/supabase-js`, Vitest + Supertest, ESLint + Prettier. Note the
     Anthropic SDK is present but **deferred to seminar 6** (LLM features).
   - **Commands** — install, `dev`, `test`, `test:watch`, `lint`, `format`,
     `typecheck`, `build`, `start` (exact npm commands, run from `backend/`).
   - **API structure** — base path `/api`; one router file per resource under
     `src/routes`; business logic in `src/services`; Zod schemas in
     `src/schemas`; DB access via `src/db`; auth/error middleware in
     `src/middleware`. List the planned endpoints (see the later chunks) so the
     map is visible.
   - **Database schema** — summarise the §13 data model (Member, Activity,
     Round, Week, LogEntry, Challenge, ChallengeSubmission, ChallengeRotation,
     MemberRoundDivision) and note migrations live in `supabase/migrations`
     (created in chunk 3). It is fine to describe the schema before migrations
     exist; keep it updated as they land.
   - **How to add an endpoint** — the concrete recipe: add a Zod schema →
     add/extend a router in `src/routes` → put logic in a `src/services`
     function → mount the router in `app.ts` → write a Supertest test →
     update this file.
   - The rule: **when you add a feature or endpoint or change structure, update
     this file.**

## Files it creates or changes

- `CLAUDE.md` (root — updated)
- `backend/CLAUDE.md` (new)

## How to verify

- Both files render as valid Markdown and pass `prettier --check` in their
  respective scopes.
- A newcomer can read `backend/CLAUDE.md` and know how to run, test, and add an
  endpoint without reading code.

## Dependencies

Chunk 1 (backend baseline exists and the commands described actually work).

## Follow the repo rules

Docs-only change, but still keep Prettier clean and use a Conventional Commit
(`docs:`).

Commit and push.
