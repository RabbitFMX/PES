# Chunk 7 — Dashboard API

## Description

Compute the logged-in member's current-week summary for the dashboard: weekly
points vs the 100 goal, round total, pack rank, 100+ streak, and this week's
challenge pointer.

## Exactly what to do

1. `GET /api/dashboard` (auth required) → the frontend `DashboardData` shape:
   `{ weeklyPoints, weeklyGoal: 100, roundTotal, packRank, packSize,
   streakWeeks, currentChallenge: { id, title, hasSubmitted } | null }`.
2. Compute in a `src/services/dashboard.ts`:
   - `weeklyPoints` = sum of `final_points` for the member in the current open
     week.
   - `roundTotal` = sum over all weeks in the open round.
   - `packRank` / `packSize` = the member's rank within their division for the
     round (reuse the standings logic; if it does not exist yet, add a small
     shared `standings` helper here and reuse it in the Leaderboard chunk).
   - `streakWeeks` = consecutive weeks (up to now) with ≥ 100 points.
   - `currentChallenge` = this week's challenge (if any) + whether the member
     submitted.
3. Handle the new-member/new-week case (all zeros, `currentChallenge` may be
   null) so the frontend empty state renders.

## Files it creates or changes

- `backend/src/routes/dashboard.ts` (new)
- `backend/src/services/dashboard.ts` (new)
- `backend/src/services/standings.ts` (new or shared — rank/goal helpers)
- `backend/src/schemas/dashboard.ts` (new)
- `backend/src/app.ts` (mount router)
- `backend/CLAUDE.md` (endpoint — update)

## How to verify

- Unit tests for streak and rank helpers against fixture rows.
- Supertest: seeded member returns plausible numbers; a member with no entries
  returns zeros and does not error.
- `npm run typecheck` / `lint` / `test` clean.

## Dependencies

Chunks 1–4 and 6 (log entries exist to aggregate).

## Follow the repo rules

Test-driven (streak/rank helpers first), lint/format/type-check clean,
Conventional Commits (`feat:`), update `backend/CLAUDE.md`.

Commit and push.
