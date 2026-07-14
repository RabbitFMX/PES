# Chunk 8 — Leaderboard API

## Description

Current-round standings split by pack (division A / B), with per-member round
total and weekly-goal status.

## Exactly what to do

1. `GET /api/leaderboard` (auth required) → `{ packA: LeaderboardRow[],
   packB: LeaderboardRow[] }` where a row is
   `{ memberId, displayName, avatarUrl, rank, roundTotal, goalMetThisWeek,
   isCurrentUser }`.
2. Reuse the `standings` helper from the Dashboard chunk:
   - Group active members by their division **for the current round**
     (`member_round_division` when present, else `member.division`).
   - `roundTotal` = sum of `final_points` over the round's weeks.
   - Sort descending by `roundTotal`, assign `rank` (ties share a rank or use a
     stable tiebreak — document the choice).
   - `goalMetThisWeek` = member's current-week points ≥ 100.
   - `isCurrentUser` = row is the requester.
3. Empty state: a pack with no logged activity returns an empty array (frontend
   shows the "be first" empty state).

## Files it creates or changes

- `backend/src/routes/leaderboard.ts` (new)
- `backend/src/services/leaderboard.ts` (new, using `standings`)
- `backend/src/schemas/leaderboard.ts` (new)
- `backend/src/app.ts` (mount router)
- `backend/CLAUDE.md` (endpoint — update)

## How to verify

- Unit test: standings sort + rank assignment against fixtures (including a tie).
- Supertest: seeded data returns two packs, correct ordering, `isCurrentUser`
  set on exactly one row; empty pack → `[]`.
- `npm run typecheck` / `lint` / `test` clean.

## Dependencies

Chunks 1–4, 6, and the `standings` helper from chunk 7.

## Follow the repo rules

Test-driven, lint/format/type-check clean, Conventional Commits (`feat:`),
update `backend/CLAUDE.md`.

Commit and push.
