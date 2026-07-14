# Chunk 1 — Backend initialisation

## Description

Get `backend/` to a clean, runnable baseline: correct project structure, a
dependency manifest, a base Express + TypeScript server that boots and answers a
health check, and proper environment handling (`.env.example` committed, real
`.env` git-ignored).

**Note:** a backend scaffold already exists and is committed (Express + TS
`app.ts`/`server.ts`, a `/api/health` route, `errorHandler` middleware, stub
`db/supabaseClient.ts` and `llm/anthropicClient.ts`, a `points` service, a
`logEntry` Zod schema, plus `tsconfig.json`, `vitest.config.ts`,
`eslint.config.mjs`, `.prettierrc.json`, `package.json`). This chunk **verifies
and hardens** that baseline — do not blindly recreate what is already there.

## Exactly what to do

1. Confirm the tree matches `backend/CLAUDE.md`'s intended structure
   (`src/routes`, `src/services`, `src/db`, `src/schemas`, `src/middleware`,
   `src/llm`). Create any missing directory with a short `README` or leave it
   for later chunks.
2. Verify `package.json` scripts exist and work: `dev` (tsx watch), `build`
   (tsc), `start` (node dist), `test` (vitest run), `test:watch`, `lint`,
   `format`, `format:check`, `typecheck`. Add any that are missing.
3. Ensure the base server boots: `createApp()` in `src/app.ts` mounts
   `express.json()`, CORS (allow the frontend dev origin, e.g.
   `http://localhost:5173`), the `/api` router, and the error handler last.
   `src/server.ts` reads `PORT` from env (default 3001) and listens.
4. Confirm `GET /api/health` returns `{ status: "ok" }`.
5. Environment: `.env.example` lists every variable the app reads —
   `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`,
   `ANTHROPIC_API_KEY` (leave the last one present but unused — it belongs to
   seminar 6). Values in `.env.example` are empty. Confirm `.env` is covered by
   the root `.gitignore` (it is) and is **not** tracked.
6. Add a `cors` dependency if not already present; keep the allowed origin
   configurable via an env var (e.g. `CORS_ORIGIN`, default the Vite dev URL).

## Files it creates or changes

- `backend/package.json` (scripts/deps — verify/extend)
- `backend/src/app.ts` (CORS + router wiring — verify)
- `backend/src/server.ts` (env-driven port — verify)
- `backend/.env.example` (full variable list)
- possibly new empty dirs under `backend/src/`

## How to verify

- `cd backend && npm install` succeeds.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test`
  all pass.
- `npm run dev`, then `curl -s localhost:3001/api/health` → `{"status":"ok"}`.
- `git status` shows no `.env` file staged; `.env.example` is tracked.

## Dependencies

None (first chunk). Assumes Node 24 + npm are installed (they are).

## Follow the repo rules

Test-driven where it makes sense (there is already a `health.test.ts` — keep it
green), keep ESLint, Prettier, and `tsc` clean before committing, and use
Conventional Commits (`chore:`, `feat:`, `fix:`, `test:`, `docs:`).

Commit and push.
