# CLAUDE.md — PES frontend

Standing context for working in `frontend/`. See `../project-brief.md` for the
product, `../assignment/frontend.md` for the UI/UX spec this implements, and
`../CLAUDE.md` for repo-wide engineering rules.

## Frontend

The PES web client: a private, invite-only, mobile-first gamified tracker for a
friend group's sport-activity competition (weekly 100-point goal, two divisions,
rounds, rotating challenges). This is the whole user-facing app — dashboard,
activity logging, leaderboard, stats, challenges, admin, profile.

**Phase 1 (current): the app runs entirely on mock data.** There is no backend
yet. Every server interaction goes through a single mock layer
(`src/lib/mockApi.ts`) where each function is marked `TODO: connect to API` and
returns the exact shape the real endpoint will return. Swapping to the real API
means reimplementing that one file (plus wiring auth), nothing else.

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
│   ├── mockApi.ts        # THE mock backend — every call marked TODO: connect to API
│   ├── types.ts          # shared UI-facing types (the data shapes screens render)
│   ├── mockPoints.ts     # points calculation used by the mock (brief §13/§14)
│   ├── useAsync.ts       # loading/error/reload hook every data screen uses
│   ├── format.ts, cn.ts  # pure helpers
├── context/              # providers, split into hook (.ts) + provider (.tsx):
│   │                       #   theme, auth, toast, logActivity
├── components/
│   ├── ui/               # DESIGN SYSTEM: reusable primitives (Button, Input,
│   │                       #   Modal, Card, Badge, ProgressRing, Tabs, Toast…)
│   ├── layout/           # AppShell, TopBar, BottomTabBar, ProfileMenu
│   └── *.tsx             # Logo, RequireAuth, RequireAdmin, ThemeLanguageSwitcher
├── pages/                # one folder per screen; each owns its subcomponents
│   ├── login/ dashboard/ log-activity/ leaderboard/ stats/ challenges/ admin/ profile/
├── i18n/                 # cs.json / en.json + i18next setup
└── test/setup.ts         # jest-dom matchers
```

- **Design system lives in two places only:** `styles/theme.css` (tokens) and
  `components/ui/` (primitives). Screens compose these; they do not invent
  styles.
- **All mock data is in `lib/mockApi.ts`.** Do not scatter fixtures into
  components.
- Tests are colocated (`*.test.ts[x]` next to the code).

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
- **Backend calls:** only ever via `lib/mockApi.ts`. When adding one, add it
  there with a `// TODO: connect to API` comment and a typed return shape.
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
