# Chunk 10 — Challenges API

## Description

The weekly rotating challenge: read the current challenge + submissions, read
past results, let the current setter create one (auto-rotation order), and let
members submit a value. Winners earn +30/+20/+10 bonus points, split evenly on
ties.

## Exactly what to do

1. `GET /api/challenges/current` (auth) → `ChallengeData`:
   `{ id, title, description, deadline, isSetterTurn, hasSubmitted,
   submissions: { memberId, displayName, value, rank, bonusPoints }[] }`.
   - `id: null` when no challenge is set this week (frontend empty state).
   - `isSetterTurn` = the requester is the current setter per
     `challenge_rotation` and none is set yet.
   - Compute `rank` + `bonusPoints` from submissions: 30/20/10 for 1st/2nd/3rd
     (or the setter's custom split), **ties split the placement's points evenly**
     (§15/§22 Feature 5).
2. `GET /api/challenges/past` (auth) → recent finished challenges with winner +
   week label.
3. `POST /api/challenges` (auth, setter only) → create this week's challenge
   from `{ title, description, deadline }` (+ optional custom bonus split);
   reject if the requester is not the current setter or one already exists.
4. `POST /api/challenges/:id/submissions` (auth) → upsert the member's value
   (keep latest); recompute ranks/bonuses; one bonus award per member per
   challenge.
5. Bonus computation lives in a pure, tested `src/services/challenges.ts`
   function so the tie-split maths is verifiable in isolation.

## Files it creates or changes

- `backend/src/routes/challenges.ts` (new)
- `backend/src/services/challenges.ts` (new — ranking + tie-split)
- `backend/src/schemas/challenge.ts` (new)
- `backend/src/app.ts` (mount router)
- `backend/CLAUDE.md` (endpoints — update)

## How to verify

- Unit tests: bonus split for clear 1/2/3, a 2-way tie for 1st (15/15 then 3rd
  gets 10), and a 3-way tie; "keep latest submission"; one award per member.
- Supertest: non-setter `POST /api/challenges` → 403; setter → 201; submitting a
  value appears in `current` with a rank; no-challenge week → `id: null`.
- `npm run typecheck` / `lint` / `test` clean.

## Dependencies

Chunks 1–4 (auth, members, weeks, rotation seeded/available).

## Follow the repo rules

Test-driven (tie-split maths first), lint/format/type-check clean, Conventional
Commits (`feat:`), update `backend/CLAUDE.md`.

Commit and push.
