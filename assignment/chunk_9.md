# Chunk 9 — My Stats API

## Description

Aggregate a member's long-term records and behavioural patterns for the Stats
screen: record cards, day-of-week distribution, points-over-time, current-week
breakdown, and routine detection.

## Exactly what to do

1. `GET /api/stats?roundId=<id>` (auth required, `roundId` optional → defaults
   to the open round) → the frontend `StatsData` shape:
   `{ records: { bestWeek, bestRoundFinish, favouriteActivity, lifetimePoints,
   longestStreakWeeks, totalKmAllTime, weeksAtGoal }, pointsOverTime:
   {date,points}[], pointsByDayOfWeek: {day,points}[], routineDetected:
   string|null, currentWeekByDay: {day,points}[] }`.
2. Compute in `src/services/stats.ts`:
   - `bestRoundFinish` uses `member_round_division` for the member's real
     division in the finished round (§13/§25) — not their current division.
   - `favouriteActivity` = activity with the most entries/points.
   - `totalKmAllTime` = sum of `quantity` for km-unit activities.
   - `routineDetected` = a simple heuristic over distinct `activity_date` days
     (e.g. "push-ups 18 of the last 21 mornings"); `null` when nothing strong.
   - `pointsByDayOfWeek` / `pointsOverTime` / `currentWeekByDay` = grouped sums.
3. Year-spanning aggregates should be computed efficiently (indexed queries);
   caching is optional for MVP but note where it would go.
4. Empty state: no history → zeroed records and empty arrays,
   `routineDetected: null` (frontend shows its placeholder, charts do not break).

## Files it creates or changes

- `backend/src/routes/stats.ts` (new)
- `backend/src/services/stats.ts` (new)
- `backend/src/schemas/stats.ts` (new)
- `backend/src/app.ts` (mount router)
- `backend/CLAUDE.md` (endpoint — update)

## How to verify

- Unit tests for the aggregation helpers (day-of-week grouping, streak, favourite
  activity, routine heuristic) against fixtures.
- Supertest: seeded member returns populated stats; empty member returns zeros
  and empty arrays without error.
- `npm run typecheck` / `lint` / `test` clean.

## Dependencies

Chunks 1–4, 6 (log entries), reuses streak logic from chunk 7.

## Follow the repo rules

Test-driven, lint/format/type-check clean, Conventional Commits (`feat:`),
update `backend/CLAUDE.md`.

Commit and push.
