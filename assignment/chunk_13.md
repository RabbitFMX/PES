# Chunk 13 — End-to-end testing & polish

## Description

Prove the whole app works against the real backend, tighten the rough edges, and
leave both apps green. No new features — verification, error/edge handling, and
polish only.

## Exactly what to do

1. **Run the full stack** — backend (`npm run dev`, seeded Supabase) + frontend
   (`npm run dev`) against a real member and an admin. Walk every screen and the
   four flows from the frontend assignment (log activity detailed + quick-add,
   check standing → stats, participate in a challenge, admin edit).
2. **End-to-end tests** — add a small suite that exercises the real API for the
   critical paths: login → dashboard, log an entry → weekly total rises,
   leaderboard ordering, challenge submit + bonus, an admin write. Use Supertest
   against the backend and/or a frontend integration test hitting a running API
   (or a thin e2e with the tool already in the repo — do not add a heavy new
   framework without noting it).
3. **States** — confirm every data screen renders loading (skeleton), empty
   (the exact bilingual copy from brief §18), and error (toast/retry) against
   real responses; verify the no-optimistic-UI rule on admin writes.
4. **Cross-cutting checks** — CS/EN i18n complete (no hard-coded strings),
   light/dark, keyboard operability + focus, `<html lang>` sync, WCAG AA colour
   usage (accent/success fill-only).
5. **Deferred placeholders present** — the Log-activity NL mode still shows
   `TODO: LLM API (seminar 6)`; if a weekly-status/n8n or MCP touchpoint is
   referenced anywhere, it carries a `TODO: <topic> (its seminar)` note and a
   mock — not a real implementation.
6. **Green gates, both apps** — `typecheck`, `lint`, `format:check`, `test`,
   `build` all pass in `frontend/` and `backend/`. Fix anything that fails.
7. **Docs** — final pass on root `CLAUDE.md`, `frontend/CLAUDE.md`,
   `backend/CLAUDE.md`: commands, structure, and endpoint list match reality.
   Note how to run both apps together for a demo.

## Files it creates or changes

- `backend/src/**/*.test.ts` and/or `frontend/src/**/*.test.tsx` (e2e/critical-
  path tests)
- small fixes across both apps (states, a11y, copy)
- `CLAUDE.md`, `frontend/CLAUDE.md`, `backend/CLAUDE.md` (final accuracy pass)

## How to verify

- The documented critical-path tests pass.
- Both apps: `npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build` succeed.
- Manual walkthrough of all screens on the real API shows no console errors and
  correct empty/loading/error behaviour.

## Dependencies

All previous chunks (1–12).

## Follow the repo rules

Test-driven for the new e2e coverage, keep both apps' lint/format/type-check
clean, Conventional Commits (`test:`, `fix:`, `docs:`), and update every
`CLAUDE.md` touched.

Commit and push.
