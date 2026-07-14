# Chunk 6 — Log activity API (points calc + preview + commit)

## Description

The core write path: compute points server-side using the per-activity
elevation/stroller/tiered rules (§13/§14), return a confirm-before-save
preview, and persist confirmed entries as `log_entry` rows. Covers **detailed**
and **quick-add** modes. Natural-language parsing is **deferred** (LLM,
seminar 6) — leave a stub + TODO.

## Exactly what to do

1. Complete the points service `backend/src/services/points.ts`:
   - Detailed: `raw = quantity × base_rate (+ elevation bonus)`, where
     `base_rate` uses `stroller_base_rate_override` when `with_stroller` and the
     override exists; elevation bonus uses the stroller-specific per-50 m rate
     when applicable. Tiered activities: the chosen preset value **is** the raw
     points. Quick-add: `raw = points`.
   - `final = round2(raw × member.coefficient)`. The ×1.25 coefficient applies
     to quick-add too (§25).
   - Keep it pure and unit-test it thoroughly (mirror
     `frontend/src/lib/mockPoints.ts` cases: 8 km run = 24, +200 m = 30, with
     stroller = 34, túra override 1.5→2, ×1.25 = 30, tiered passthrough).
2. `POST /api/log-entries/preview` — validate body with Zod
   (`activityId, quantity, elevationM?, withStroller?, activityDate?` for
   detailed; `points, note?` for quick-add), compute, return the `LogPreview`
   shape (`activityName, quantity, unit, rawPoints, coefficient, finalPoints`).
   No DB write.
3. `POST /api/log-entries` — validate, recompute server-side (never trust
   client points), resolve the current open `week`, insert `log_entry`
   row(s) with `raw_points`/`final_points`/`source`, return the saved entries +
   the member's new weekly total. Reject entries dated outside the open week.
4. Duplicate guard: if an identical `activity_id + quantity + activity_date`
   already exists for the member, still allow it but return a `duplicate: true`
   flag so the UI can show its soft warning.
5. **Deferred:** add `POST /api/log-entries/parse` returning `501`/stub with a
   comment `// TODO: LLM API (seminar 6) — natural-language parsing`. Do not
   implement LLM calls.

## Files it creates or changes

- `backend/src/services/points.ts` (complete + `points.test.ts` expand)
- `backend/src/routes/logEntries.ts` (new)
- `backend/src/schemas/logEntry.ts` (extend preview/commit shapes)
- `backend/src/app.ts` (mount router)
- `backend/CLAUDE.md` (endpoints + the deferred parse note — update)

## How to verify

- `points.test.ts` covers every rule above and passes.
- Supertest: preview returns correct `finalPoints`; commit inserts a row and the
  weekly total increases; out-of-week date rejected (400); duplicate flagged.
- `POST /api/log-entries/parse` returns the documented "not implemented yet"
  response (no crash).
- `npm run typecheck` / `lint` / `test` clean.

## Dependencies

Chunks 1–5.

## Follow the repo rules

Test-driven (points rules first, then endpoints), lint/format/type-check clean,
Conventional Commits (`feat:`), update `backend/CLAUDE.md`. Keep the LLM path a
clearly-marked TODO — do not build it.

Commit and push.
