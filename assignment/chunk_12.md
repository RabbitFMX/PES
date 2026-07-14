# Chunk 12 — Connect the frontend to the backend

## Description

Replace the frontend's mock data with real API calls at every
`TODO: connect to API` marker, and wire real Supabase Auth login. Keep the swap
contained: screens should not change — only the single data layer and the auth
provider. The natural-language parse stays on its mock (LLM is seminar 6).

## Exactly what to do

1. **API client** — add `frontend/src/lib/apiClient.ts`: a small `fetch`
   wrapper that prefixes `import.meta.env.VITE_API_BASE_URL`, sets JSON headers,
   attaches the Supabase access token as `Authorization: Bearer …`, and throws a
   typed error on non-2xx (so `useAsync`/toasts still work).
2. **Supabase client** — add `frontend/src/lib/supabase.ts` using
   `@supabase/supabase-js` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
3. **Auth** — update `AuthProvider` so `login()` calls Supabase
   `signInWithPassword`, stores the session, and fetches `GET /api/me` for the
   `CurrentUser`; `logout()` calls Supabase `signOut`; on load, resume an
   existing session and hydrate the user. Keep the existing `useAuth` surface so
   screens/guards are untouched.
4. **Swap the data layer** — reimplement every exported function currently in
   `frontend/src/lib/mockApi.ts` to call the backend via `apiClient`, keeping
   **identical signatures and return types** so no screen changes. Recommended:
   rename to `frontend/src/lib/api.ts` and update imports, or keep the filename.
   Map each function to its endpoint:
   - `getDashboard` → `GET /api/dashboard`
   - `getActivities` → `GET /api/activities`
   - `previewDetailed` / `previewQuickAdd` → `POST /api/log-entries/preview`
   - `commitEntries` → `POST /api/log-entries`
   - `getLeaderboard` → `GET /api/leaderboard`
   - `getStats` → `GET /api/stats`
   - `getChallenge` / `getPastChallenges` / `submitChallenge` /
     `createChallenge` → the `/api/challenges*` endpoints
   - admin `getMembers`/`saveMember`/`inviteMember`/`getAdminActivities`/
     `saveActivity`/`getRounds`/`saveRound`/`getRotation`/`saveRotation` →
     `/api/admin/*`
5. **Keep deferred on mock** — `parseNaturalLanguage` stays a local mock; leave
   the marker `// TODO: LLM API (seminar 6) — natural-language parsing` and keep
   the failure/fallback behaviour so the UI path is still demoable.
6. **Env** — ensure `frontend/.env.example` documents `VITE_API_BASE_URL`,
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; `.env` stays git-ignored.
7. Update the frontend tests that stubbed `mockApi` to mock `apiClient`/`api`
   instead; keep them green.

## Files it creates or changes

- `frontend/src/lib/apiClient.ts`, `frontend/src/lib/supabase.ts` (new)
- `frontend/src/lib/api.ts` (was `mockApi.ts` — real calls; NL parse still mock)
- `frontend/src/context/AuthProvider.tsx` (real Supabase auth)
- `frontend/src/**` import updates if the file was renamed
- `frontend/.env.example`, `frontend/CLAUDE.md` (note the API layer — update)

## How to verify

- With the backend running + seeded and a real member logged in: dashboard,
  leaderboard, stats, challenges, admin all load real data; logging an activity
  persists and the dashboard total updates; NL mode still shows the mock
  preview / fallback.
- `frontend`: `npm run typecheck` / `lint` / `test` / `build` all clean.
- No remaining `TODO: connect to API` except the LLM parse marker.

## Dependencies

All backend chunks that expose the endpoints being wired (1–11). Chunks for
endpoints not yet built can stay on their mock until built — wire incrementally.

## Follow the repo rules

Keep tests green (update mocks), lint/format/type-check clean, Conventional
Commits (`feat:` / `refactor:`), update `frontend/CLAUDE.md` (data now comes from
the API; mock only remains for the deferred LLM parse).

Commit and push.
