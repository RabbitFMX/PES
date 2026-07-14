# Chunk 4 — Authentication & route protection

## Description

Wire Supabase Auth (email + password) into the backend: verify the caller's
Supabase JWT, resolve it to a `member` row, expose the current user, and guard
routes by authentication and by admin role. This is the gate every feature
endpoint sits behind.

## Exactly what to do

1. Add auth middleware `backend/src/middleware/auth.ts`:
   - Read the `Authorization: Bearer <jwt>` header.
   - Verify it with Supabase (`supabase.auth.getUser(jwt)` using the configured
     client, or JWT verification with the project's JWKS/secret).
   - Load the matching `member` row (by `auth.users` id) and attach
     `req.member` (typed). Reject with 401 if missing/invalid.
2. Add `requireAuth` and `requireAdmin` guards (the latter 403s non-admins).
   Mirror the frontend rule: a direct hit on an admin route by a member is
   rejected, not just hidden.
3. Add `GET /api/me` → returns the current user in the frontend `CurrentUser`
   shape (`id, displayName, email, avatarUrl, role, division, coefficient,
   languagePref, themePref`). This backs the frontend session/bootstrap.
4. Invite-acceptance & profile: the actual account creation/login happens via
   Supabase Auth on the client; the backend side of invite is an admin action
   (covered in the Admin chunk). Here, ensure a freshly authenticated user with
   no `member` row is handled gracefully (documented 403/"not a member" — no
   auto-provisioning, matching invite-only §11).
5. Add a typed `AuthedRequest` and a small helper to register protected routers.

## Files it creates or changes

- `backend/src/middleware/auth.ts` (new)
- `backend/src/routes/me.ts` (new — `GET /api/me`)
- `backend/src/app.ts` (mount `me`, apply guards where appropriate)
- `backend/src/schemas/*` (CurrentUser response schema)
- `backend/CLAUDE.md` (auth model + how guards are applied — update)

## How to verify

- Supertest: `GET /api/me` with no token → 401; with a valid token for a seeded
  member → 200 and the correct `CurrentUser` JSON; an admin-only test route with
  a member token → 403.
- `npm run typecheck` / `lint` / `test` clean.

## Dependencies

Chunks 1–3 (server + schema + a `member` row to resolve to). Requires a real or
mocked Supabase Auth for tests (mock `auth.getUser` in unit tests).

## Follow the repo rules

Write the guard tests first, keep lint/format/type-check clean, Conventional
Commits (`feat:`), update `backend/CLAUDE.md`.

Commit and push.
