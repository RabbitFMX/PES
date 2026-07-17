# CLAUDE.md — PES frontend

Standing context for working in `frontend/`. See `../project-brief.md` for the
product, `../assignment/frontend.md` for the UI/UX spec this implements, and
`../CLAUDE.md` for repo-wide engineering rules.

## Frontend

The PES web client: a private, invite-only, mobile-first gamified tracker for a
friend group's sport-activity competition (weekly 100-point goal, two divisions,
rounds, rotating challenges). This is the whole user-facing app — dashboard,
activity logging, leaderboard, stats, challenges, admin, profile.

**The app now runs against the real backend.** Every server interaction goes
through a single data layer (`src/lib/api.ts`), a thin wrapper over the
`/api/*` endpoints via `src/lib/apiClient.ts` (which attaches the Supabase JWT
and throws `ApiError` on non-2xx). Login uses real Supabase Auth
(`src/lib/supabase.ts`), wired in `AuthProvider`. The **only** remaining mock is
`parseNaturalLanguage` (natural-language logging), deferred to the LLM seminar
and marked `TODO: LLM API (seminar 6)`; it keeps a demoable success/failure
path. Config comes from `VITE_API_BASE_URL` / `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` (see `.env.example`; real values in a gitignored `.env`).

## Tech stack

- **Framework:** React 19 + Vite 8 (SPA, client-side routing via React Router 7)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4 (CSS-first config via `@theme` in
  `src/styles/theme.css`; no `tailwind.config.ts`). Design tokens are CSS
  variables; light/dark switch via a `data-theme` attribute on `<html>`.
- **Charts:** Recharts (lazy-loaded on the Stats route only)
- **i18n:** react-i18next + i18next — Czech default, English available
- **Test runner:** Vitest + React Testing Library + jsdom (`@testing-library/jest-dom`)
- **Linter:** ESLint (flat config, `typescript-eslint`, react-hooks, react-refresh)
- **Formatter:** Prettier (no semicolons, single quotes, width 100)
- **Package manager:** npm

## Commands

Run from `frontend/`:

- Install: `npm install`
- Dev server: `npm run dev` (http://localhost:5173)
- Test (once): `npm run test` · watch: `npm run test:watch`
- Lint: `npm run lint`
- Format: `npm run format` · check only: `npm run format:check`
- Type-check: `npm run typecheck`
- Production build: `npm run build` · preview it: `npm run preview`

Before committing, `npm run typecheck && npm run lint && npm run format:check && npm run test` must all pass.

## Structure

```
src/
├── main.tsx              # entry: mounts providers (Theme → Auth → Toast → Router)
├── App.tsx               # route tree + guards; lazy-loads the Stats route
├── styles/theme.css      # DESIGN SYSTEM: CSS-variable tokens, light/dark, focus ring
├── lib/
│   ├── api.ts            # THE data layer — real `/api/*` calls (NL parse still mock)
│   ├── apiClient.ts      # fetch wrapper: base URL + Supabase JWT + ApiError
│   ├── supabase.ts       # Supabase Auth client (email+password)
│   ├── types.ts          # shared UI-facing types (the data shapes screens render)
│   ├── mockPoints.ts     # points calc used only by the deferred NL-parse mock (brief §13/§14)
│   ├── useAsync.ts       # loading/error/reload hook every data screen uses
│   ├── consent.ts        # GDPR consent: per-browser storage + policy version/hash (fnv1a)
│   ├── analytics.ts, marketing.ts  # non-essential script SEAMS — init/teardown only, gated by consent
│   ├── testData.ts       # "test data" toggle (localStorage) → X-PES-Test-Data header via apiClient
│   ├── format.ts, cn.ts  # pure helpers
├── context/              # providers, split into hook (.ts) + provider (.tsx):
│   │                       #   theme, auth, toast, logActivity, consent
├── components/
│   ├── ui/               # DESIGN SYSTEM: reusable primitives (Button, Input,
│   │                       #   Modal, Card, Badge, ProgressRing, Tabs, Toast…)
│   ├── layout/           # AppShell, TopBar, BottomTabBar, ProfileMenu
│   └── *.tsx             # Logo, RequireAuth, RequireAdmin, ThemeLanguageSwitcher
├── pages/                # one folder per screen; each owns its subcomponents
│   ├── login/ dashboard/ log-activity/ leaderboard/ stats/ challenges/ admin/ profile/ rules/
│   │     # rules/ = the Rules screen; content in rules/rulesContent.ts (from PES 2.0.xlsx `pravidla`)
├── i18n/                 # cs.json / en.json + i18next setup
└── test/setup.ts         # jest-dom matchers
```

- **GDPR consent:** `ConsentProvider` (mounted in `main.tsx`) holds the
  per-browser decision (localStorage, `lib/consent.ts`) and is the ONLY place
  non-essential integrations start/stop — it calls `initAnalytics`/`initMarketing`
  (and their teardowns) so those scripts never load without consent. The
  `ConsentBanner` (no pre-ticked boxes) captures the first decision; Profile →
  Privacy withdraws/grants later. Every decision is POSTed to `/api/consent`
  (`recordConsent` in `lib/api.ts`) for the server audit log. To wire a real
  analytics/marketing vendor, fill in `lib/analytics.ts` / `lib/marketing.ts` —
  the consent gate already wraps them.
- **Dog avatars:** `lib/dogAvatar.ts` (data + `dog:<breed>:<coat>:<tail>:<collar>`
  token, legacy-token compatible) + `components/DogAvatar.tsx` (parametric
  full-body side-view SVG). ~24 breeds (ear/snout/build presets), ~15 coats incl.
  patterns (spots/patches/saddle/mask/merle), 5 tails and 4 collars. Built in
  Profile; rendered via the `Avatar` primitive for any `dog:` token.
- **Activity icons:** `components/ActivityIcon.tsx` + mapping in
  `lib/activityIcon.ts` — one line-icon set for all 35 activities, used in the
  log picker, stats, overview and pie legend.
- **Test-data toggle:** Profile has a "test data" switch (`lib/testData.ts`,
  persisted in localStorage). When on, `apiClient` adds the `X-PES-Test-Data`
  header and the backend serves generated per-activity detail (real weekly
  totals preserved) so all stats/dashboard screens can be exercised. Toggling
  reloads the page so every screen refetches.
- **Design system lives in two places only:** `styles/theme.css` (tokens) and
  `components/ui/` (primitives). Screens compose these; they do not invent
  styles.
- **All backend access is in `lib/api.ts`.** Do not scatter fetch calls or
  fixtures into components.
- Tests are colocated (`*.test.ts[x]` next to the code); tests mock `lib/api`
  (and `lib/supabase` for auth) rather than hitting the network.

## Conventions

- **Components:** PascalCase named exports (no default exports except `App`),
  one component family per file; a screen folder holds the page plus its private
  subcomponents.
- **Styling:** Tailwind utility classes referencing theme tokens
  (`bg-surface`, `text-muted`, `text-primary`, `rounded-[var(--radius-md)]`).
  **Never hard-code hex values in components** — add/adjust tokens in
  `theme.css`. Amber (`accent`) and emerald (`success`) are fill-only (dark text
  on top); never use them as text color on the background (fails WCAG AA).
- **Data fetching:** use the `useAsync` hook; render explicit loading
  (Skeleton), empty (EmptyState), and error (ErrorState + retry) states for
  every data-driven screen.
- **Backend calls:** only ever via `lib/api.ts` (through `apiClient`). When
  adding one, add a typed function there mapping to its `/api/*` endpoint; keep
  signatures aligned with what screens expect.
- **i18n:** no hard-coded user-facing strings — add keys to `i18n/cs.json` and
  `i18n/en.json` (keep both in sync) and use `t('…')`.
- **Accessibility:** real `<label>`s for inputs; `aria-label` on icon-only
  buttons; visible focus (global `:focus-visible` ring — don't remove it);
  modals trap focus and restore it; respect `prefers-reduced-motion`; keep
  `<html lang>` in sync with the active language.
- **Testing:** write a test when adding non-trivial logic or an interactive
  component; keep the core-UI tests (`components/ui/ui.test.tsx`) and the
  login→navigate integration test passing.
- **When you add a screen or component, or change the structure, update this
  file** (the Structure and, if relevant, Conventions sections).
