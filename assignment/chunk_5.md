# Chunk 5 — Activities API (read the rate table)

## Description

Expose the active activity rate table so the Log-activity modal and admin
screens can read it. Small, self-contained read endpoint.

## Exactly what to do

1. Add `GET /api/activities` → returns active activities (`active = true`) in
   the frontend `Activity` shape:
   `{ id, nameCs, nameEn, unit, hasElevationBonus, hasStrollerOption, isTiered,
   tierOptions, active }`. (The full rate fields — `pointsPerUnit`,
   elevation/stroller rates — stay server-side for points calc and the admin
   editor; the public read can include them too, but at minimum return what the
   log modal needs.)
2. Put the read logic in a `src/services/activities.ts` function backed by the
   chunk-3 DB layer; keep the route thin.
3. Requires authentication (any member). Map DB snake_case → API camelCase in
   one place (a serializer helper) so every endpoint is consistent.

## Files it creates or changes

- `backend/src/routes/activities.ts` (new)
- `backend/src/services/activities.ts` (new)
- `backend/src/schemas/activity.ts` (response shape — new)
- `backend/src/app.ts` (mount router)
- `backend/CLAUDE.md` (list the endpoint — update)

## How to verify

- Supertest: authenticated `GET /api/activities` → 200, array length 35 (seeded),
  every row camelCase, tiered rows carry `tierOptions`. Unauthenticated → 401.
- `npm run typecheck` / `lint` / `test` clean.

## Dependencies

Chunks 1–4.

## Follow the repo rules

Test-first (the Supertest case), lint/format/type-check clean, Conventional
Commits (`feat:`), update `backend/CLAUDE.md`.

Commit and push.
