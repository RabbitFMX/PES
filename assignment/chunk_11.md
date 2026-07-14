# Chunk 11 — Admin API

## Description

Admin-only management endpoints behind `requireAdmin`: members (invite, edit
division/coefficient/role/exemption/status), the activity rate table (CRUD),
rounds (create, open/close), and the challenge-setter rotation order. Every
write returns a uniform result shape so the frontend's save-confirmation /
failure-toast pattern is consistent.

## Exactly what to do

1. Uniform write response: `{ ok: true } | { ok: false, message: string }` for
   every mutating admin endpoint. No partial writes (use transactions where
   multiple rows change).
2. **Members**
   - `GET /api/admin/members` → all members (incl. `left`).
   - `POST /api/admin/members/invite` `{ email }` → create the Supabase Auth
     invite + a `member` row (invite-only, §11); reject duplicate email.
   - `PATCH /api/admin/members/:id` → edit `division`, `coefficient`, `role`,
     `status`, `injuryExemptUntil`.
3. **Activities** (rate table editor)
   - `GET /api/admin/activities` → all rows incl. inactive + full rate fields.
   - `POST /api/admin/activities` → create; require both `nameCs` and `nameEn`;
     tiered rows require ≥ 1 `tierOptions` value; warn/annotate duplicate name
     within a language.
   - `PATCH /api/admin/activities/:id` → edit rates/flags/`active`.
4. **Rounds**
   - `GET /api/admin/rounds`; `POST /api/admin/rounds` (create next);
     `PATCH /api/admin/rounds/:id` (open/close). Opening/closing is manual for
     MVP (automated promotion/relegation is v2 — do not build it).
5. **Rotation**
   - `GET /api/admin/rotation`; `PUT /api/admin/rotation` (persist the reordered
     list of member ids).
6. Validate every body with Zod; reject unknown/invalid fields with a clear
   message that the frontend can surface in its failure toast.

## Files it creates or changes

- `backend/src/routes/admin/members.ts`, `activities.ts`, `rounds.ts`,
  `rotation.ts` (new — or one `admin` router with sub-routes)
- `backend/src/services/admin*.ts` (new)
- `backend/src/schemas/admin*.ts` (new)
- `backend/src/app.ts` (mount admin router under `requireAdmin`)
- `backend/CLAUDE.md` (endpoints — update)

## How to verify

- Supertest: member token on any `/api/admin/*` → 403; admin token → 200/201;
  invite with duplicate email → `{ ok: false }`; new activity missing `nameEn`
  → validation error; tiered activity with empty `tierOptions` → rejected;
  round open/close flips `status`; rotation PUT round-trips.
- `npm run typecheck` / `lint` / `test` clean.

## Dependencies

Chunks 1–5 (auth + activities read + schema). Independent of the compute
endpoints (7–10) but fine to build after them.

## Follow the repo rules

Test-driven (guard + validation cases), lint/format/type-check clean,
Conventional Commits (`feat:`), update `backend/CLAUDE.md`.

Commit and push.
