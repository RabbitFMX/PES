# CLAUDE.md

Standing instructions for developing **PES**. Full requirements live in
`project-brief.md` — read that for feature detail; this file is the
day-to-day engineering contract.

## Project

PES ("Prostě Enormně Sexy") is a private, invite-only web app for a ~30-person
friend group that replaces their years-old shared spreadsheet for tracking a
custom, points-based sport-activity competition. Members log activities
(manually, via quick-add, or via natural-language text parsed by an LLM),
chase a weekly 100-point goal, compete across two divisions with
promotion/relegation, run half-year "rounds," and set rotating weekly
challenges — all wrapped in a mobile-friendly, gamified, dog-pack-themed UI
with a live leaderboard and personal stats. Every member has a login; there
is no public-facing part of the app.

## Tech stack

- **Frontend:** React (v19, latest stable — assumption) + Vite + TypeScript +
  Tailwind CSS. Recharts for charts. `react-i18next` for CS/EN i18n (Czech
  default). React Router for navigation.
- **Backend:** Node.js (v24 LTS, already installed on this server) + Express
  + TypeScript. Zod for request/response schema validation.
- **Database:** PostgreSQL via Supabase (hosted Postgres, Auth, Storage —
  free tier). Supabase Auth handles email+password login.
- **LLM:** Anthropic SDK, Claude Haiku, called with **tool-forced** structured
  output (a `log_activities` tool whose schema only accepts a numbered index
  into the live activity list) — never freeform JSON parsing. Zod-validated
  server-side before the user sees a confirm preview.
- **Automation:** n8n, self-hosted (per the server's Docker/Traefik setup),
  for the weekly nudge workflow.
- **Package manager:** npm (assumption — ships with Node, no extra install;
  both `frontend/` and `backend/` are independent npm projects, no monorepo
  tooling like Turborepo/pnpm workspaces since the brief doesn't ask for one).
- **Test runner:** Vitest for both apps (assumption — pairs natively with
  Vite on the frontend, and keeping one test runner across the whole stack
  reduces tooling to learn). React Testing Library + `@testing-library/jest-dom`
  for component tests. Supertest for backend HTTP/integration tests.
- **Linter/formatter:** ESLint (`typescript-eslint`) + Prettier in both apps
  (assumption — the de facto standard pairing for TS projects). `tsc --noEmit`
  for type-checking.

## Repository structure

```
PES/
├── frontend/
│   ├── src/
│   │   ├── pages/            # one folder per screen: dashboard, log-activity,
│   │   │                      # leaderboard, stats, challenges, admin
│   │   ├── components/        # shared/reusable UI (buttons, progress ring, cards)
│   │   ├── lib/                # API client, hooks, utilities
│   │   ├── i18n/                # cs.json / en.json translation resources
│   │   ├── styles/               # Tailwind config, CSS variable theme tokens
│   │   ├── App.tsx, main.tsx
│   │   └── **/*.test.tsx        # colocated with the component/page it tests
│   ├── public/                    # static assets, favicon (paw-mark SVG)
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── eslint.config.js
│   ├── package.json
│   └── .env.example
├── backend/
│   ├── src/
│   │   ├── routes/            # one file per resource (activities, members,
│   │   │                      # leaderboard, challenges, weekly-status, admin)
│   │   ├── services/           # business logic: points calc, rankings, streaks
│   │   ├── db/                  # Supabase client, query helpers
│   │   ├── schemas/              # Zod request/response schemas
│   │   ├── llm/                   # Claude Haiku client + log_activities tool def
│   │   ├── middleware/             # auth guard, error handler
│   │   ├── app.ts, server.ts
│   │   └── **/*.test.ts           # colocated; route-level tests use Supertest
│   ├── tsconfig.json
│   ├── eslint.config.js
│   ├── package.json
│   └── .env.example
├── supabase/
│   └── migrations/                 # SQL migrations — schema from brief §13
├── n8n/
│   └── weekly-nudge.workflow.json   # exported n8n workflow + short README
├── project-brief.md
├── CLAUDE.md
├── README.md
└── .gitignore
```

Each app (`frontend/`, `backend/`) is self-contained: its own `package.json`,
`tsconfig.json`, lint/format config, and `.env.example`. No shared root
`package.json` or workspace tooling unless a real need for shared code
appears — if it does, discuss before adding a `packages/shared/` workspace.

## How we work (engineering rules)

1. **Test-driven:** write or update a failing test first, then the code to
   pass it. Keep tests fast and colocated with the code they cover.
2. Every change keeps the linter and formatter clean and the type checker
   green before it is committed.
3. Small, focused commits with clear messages (Conventional Commits style:
   `feat:`, `fix:`, `chore:`, `test:`, `docs:`).
4. Never commit secrets. Keep a `.env.example` (empty values) per app; `.env`
   is gitignored.
5. Prefer readable, conventional code over clever code; match existing
   patterns in the file/module you're editing.
6. Explain non-obvious decisions in the commit message or a code comment —
   the person you're working with is learning as we go.
7. Theme colours only via Tailwind/CSS-variable tokens (per brief §9) — never
   hard-code hex values in components.
8. LLM calls are never a hard dependency: every AI-assisted path (natural
   -language logging, weekly recap) must have a working manual/fallback path,
   per brief §18–19.

## Commands

**Frontend** (`cd frontend`)
- Install: `npm install`
- Dev server: `npm run dev`
- Test: `npm run test` (watch: `npm run test:watch`)
- Lint: `npm run lint` / Format: `npm run format` (check only: `npm run format:check`)
- Type-check: `npm run typecheck`
- Build: `npm run build` / Preview build: `npm run preview`

**Backend** (`cd backend`)
- Install: `npm install`
- Dev server: `npm run dev` (tsx watch)
- Test: `npm run test` (watch: `npm run test:watch`)
- Lint: `npm run lint` / Format: `npm run format` (check only: `npm run format:check`)
- Type-check: `npm run typecheck`
- Build: `npm run build` / Start (compiled): `npm start`

## Definition of done

A change is done when:
- Tests pass (new/updated tests included for the change).
- Lint, format, and type-check are all clean.
- The app runs and the change has been exercised manually (dev server /
  relevant screen or endpoint).
- `CLAUDE.md` is updated if the workflow, stack, structure, or commands
  changed.
