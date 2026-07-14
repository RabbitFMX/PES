# PES — Frontend Assignment

This is the build brief for the frontend engineer. It translates `project-brief.md`
into concrete UI/UX specification. **This phase runs on mock data only** — every
network call is a stub; wire the real API later. Nothing here describes backend
internals (schema, server logic, LLM prompts, workflows) — only what the UI needs
to render and the shape of data it expects to receive.

Stack (already scaffolded): React + Vite + TypeScript + Tailwind CSS, React
Router, `react-i18next` (CS default, EN available), Recharts.

---

## Overview

PES is a private, invite-only web app for a ~30-person friend group that
replaces their shared spreadsheet for tracking a custom, points-based sport
activity competition. Every member logs activities (manually or via natural
language), chases a weekly 100-point goal, and can see their rank inside their
division ("pack"), their long-term stats, and the weekly rotating challenge.
Admins additionally manage members, activity rates, and rounds. The product is
mobile-first in practice (people log activities on their phones right after
exercising) but must look and work equally well on desktop. Tone: professional
and motivating with light dog-pack humor — never cutesy, never corporate.

---

## Screens and pages

### 1. Login
- **Purpose:** the only thing a logged-out visitor ever sees. Fully private —
  no public leaderboard, no signup.
- **Layout:** centered card on a plain themed background — logo mark, app
  name "PES" + tagline, email field, password field, submit button, "forgot
  password" link. Language switcher available even logged-out (top-right).
- **Primary actions:** log in; recover password. No self-registration UI —
  accounts are invite-only (member arrives via an invite link that lands on a
  "set your password + fill profile" variant of this screen).

### 2. Dashboard (home)
- **Purpose:** the landing screen after login — a motivational at-a-glance hub
  for the current week.
- **Layout:** top nav (desktop) / bottom tab bar (mobile, see Navigation).
  Below it: a hero card with the **animated progress ring** (weekly points /
  100) and a contextual nudge line ("6 points to go"); a row of stat chips
  (round total, pack rank, current 100+ streak); a **challenge banner** card
  (this week's challenge title + status, or "it's your turn" prompt); a large
  primary **"Log activity"** button (desktop) — on mobile this role is filled
  by the tab bar's center "+".
- **Primary actions:** open Log activity; tap the challenge banner →
  Challenges; tap rank/stat chips → Leaderboard / My Stats.

### 3. Log activity (modal)
- **Purpose:** record an activity in one of three modes, ending in a
  confirm-before-save preview. Opens as a modal over the dashboard (or over
  whatever screen the "+" was tapped from).
- **Layout:** modal with a 3-way segmented control at the top — **Detailed /
  Quick-add / Natural language**.
  - *Detailed:* activity picker (searchable list/select, grouped, CS+EN
    names), then a quantity input whose unit and extra fields adapt to the
    chosen activity (distance in km, reps, minutes, sessions); optional
    elevation input and a stroller toggle **only shown for activities that
    support them**; for tiered activities (kayak, "various exercise/sports",
    Strava points, legacy challenge bonus) the quantity field is replaced by a
    **preset-value dropdown**; an optional date picker (defaults to today,
    constrained to the currently open week) and a note field.
  - *Quick-add:* a single points number input + optional note. Simplest path,
    for edge cases not on the rate table.
  - *Natural language:* a free-text box (≤500 chars, placeholder example in
    both languages), a "parse" action, an inline "Sniffing…" loading state,
    then the same preview step as the other modes.
  - All three modes end in a **preview card**: parsed activity name, quantity,
    `raw points → ×coefficient → final points` shown transparently (e.g. "24
    ×1.25 = 30 pts"), and Confirm / Edit / Cancel actions.
- **Primary actions:** switch mode; fill inputs; parse (NL mode only);
  confirm save; cancel/close.

### 4. Leaderboard
- **Purpose:** live current-round rankings.
- **Layout:** top nav / tab bar, then two tabs — **Pack A ("gauč") / Pack B
  ("bouda")**. Each tab shows a ranked table: rank, avatar + name, round
  total, weekly-goal status (met/not-met badge). Current user's row is
  visually highlighted.
- **Primary actions:** switch pack tab; tap a member row → a lightweight
  member detail (their public stats — same shape as My Stats but read-only,
  for another member).

### 5. My Stats
- **Purpose:** long-term personal records and behavioral patterns.
- **Layout:** header with a round/week browser (dropdown or prev/next
  arrows to move through past rounds); a grid of **record cards** (best week,
  best round finish, favourite activity, lifetime points, longest streak,
  total distance by discipline, weeks with 100+); a **day-of-week bar chart**
  (Recharts); a **points-over-time line chart** for the selected round; a
  "routine detected" callout card when applicable (e.g. "push-ups 18 of the
  last 21 mornings"); a current-week day-by-day breakdown list.
- **Primary actions:** browse past rounds/weeks; (no writes — fully
  read-only screen).

### 6. Challenges
- **Purpose:** the weekly rotating challenge — view, submit, see standings.
- **Layout:** header showing current challenge (title, description,
  deadline countdown) or an empty state; below it, a submissions list
  (member, value, computed rank) and a **bonus points breakdown** (30/20/10,
  split evenly on ties); if the current user is this week's setter and no
  challenge exists yet, a prominent "set this week's challenge" CTA opens a
  small form (title, description, deadline, optional custom bonus split).
- **Primary actions:** submit a value; set a challenge (setter only); view
  past challenge results (simple history list below the current one).

### 7. Admin (admin role only)
- **Purpose:** manage everything members shouldn't touch. Reached from the
  profile menu; entirely hidden (nav item absent, route guarded) for
  non-admins.
- **Layout:** a sub-nav (tabs or side list) across five panels:
  - **Members** — table (name, email, division, coefficient, role, status),
    invite-new-member action, per-row edit (division/coefficient/role/
    `injury_exempt_until`) and deactivate.
  - **Activity rate table** — table of all 35 activities (CS+EN name, unit,
    rate, elevation/stroller fields, tiered flag + preset values, active
    toggle), add/edit in a side-panel form.
  - **Rounds** — list of rounds (name, dates, status), open/close a round,
    create the next one.
  - **Challenge rotation** — ordered list of members (drag-to-reorder or
    up/down controls) defining who sets the challenge next.
  - **(Divisions is covered inside Members — no separate panel needed.)**
- **Primary actions:** create/edit/deactivate members; edit activity rates;
  open/close rounds; reorder challenge rotation. Every save shows an inline
  confirmation or a failure toast with retry.

### 8. Profile & settings *(assumption — not explicitly listed as a screen in
the brief, but required by it: display name/avatar editing, language and
theme preference live somewhere, per brief §12)*
- **Purpose:** a lightweight panel reachable from the profile menu (top-right
  avatar, both breakpoints) for a member to edit their own display name and
  avatar, and to switch language and theme.
- **Layout:** simple form — avatar upload/preview, display name field,
  language toggle (CS/EN), theme toggle (Light/Dark), logout button. Admins
  see an "Admin panel" link here too.
- **Primary actions:** update profile; switch language/theme; log out.

---

## Navigation and user flows

**Desktop (≥1024px):** top app bar — logo mark (left) · nav links *Dashboard ·
Leaderboard · Challenges · Stats* (center/left-of-center) · a prominent
**"Log activity"** button · profile avatar menu (right, containing Profile &
settings and, for admins, Admin).

**Mobile (<1024px):** the same screens collapse to a **bottom tab bar**:
*Dashboard · Leaderboard · [center "+" — Log activity] · Challenges · Stats*.
The profile menu moves to a small avatar icon in a slim top bar (kept for
Admin access + settings, since the bottom bar has no room for it).

Route guard: any route except Login requires an authenticated session;
`/admin/*` additionally requires the admin role (redirect home otherwise, do
not just hide the nav item — assume a direct URL hit is possible).

### Flow A — Log an activity (detailed mode)
1. From Dashboard, tap **"+"** (mobile) / **"Log activity"** (desktop).
2. Modal opens on **Detailed** (default mode). Pick an activity from the list.
3. Enter quantity (or pick a preset value if tiered); optionally set
   elevation / stroller / date / note.
4. Tap **Preview** → see parsed points breakdown (raw → ×coefficient → final).
5. Tap **Confirm** → modal closes, dashboard ring animates to the new total
   with an updated nudge line.

### Flow B — Log an activity via natural language
1. Open Log activity → switch to **Natural language** mode.
2. Type e.g. "ran 8k with 200m climb" → tap **Parse**.
3. Inline "Sniffing…" loading state (hard 8s timeout in the real system —
   mock this with a fixed delay).
4. On success, same preview-and-confirm step as Flow A.
5. On failure/timeout (mock this path too) → inline message ("The AI's nose
   is off right now — log it manually.") and an automatic switch back to
   Detailed mode with nothing lost.

### Flow C — Check standing and drill into stats
1. From Dashboard, tap the pack-rank stat chip → **Leaderboard**, correct
   pack tab pre-selected.
2. See current position highlighted in the ranked table.
3. Tap own row (or "My Stats" nav item) → **My Stats**, records + charts for
   the current round.
4. Use the round browser to look at a past round.

### Flow D — Participate in the weekly challenge
1. From Dashboard, tap the **challenge banner** → **Challenges**.
2. If a challenge is open: enter/submit a value.
3. See own submission appear in the list with live rank among submissions.
4. If the user is this week's setter and none exists yet: tap **"Set this
   week's challenge"**, fill the small form, publish it.

---

## Visual design

Brief §9 gives the light-theme palette and general style; dark theme and
everything else here is filled in as a modern, clean, accessible system and
marked **(assumption)**.

### Colour palette

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--color-primary` | `#EA580C` | `#EA580C` | App bar, key headings, logo, primary buttons (large/bold text or icon only — see Accessibility) |
| `--color-secondary` | `#1E293B` | `#CBD5E1` | Nav text, body headings, contrast elements |
| `--color-background` | `#FAFAF9` | `#0F172A` | Page background |
| `--color-surface` *(assumption)* | `#FFFFFF` | `#1E293B` | Card/modal backgrounds, one step "up" from page background |
| `--color-text` | `#0F172A` | `#F1F5F9` | Primary body text |
| `--color-text-muted` *(assumption)* | `#64748B` | `#94A3B8` | Secondary/caption text, placeholders |
| `--color-border` *(assumption)* | `#E5E4E7` | `#334155` | Dividers, input borders, card outlines |
| `--color-accent` | `#F59E0B` | `#F59E0B` | Progress ring, "+" button, celebrations — **fill only, pair with dark text/icon** |
| `--color-success` | `#10B981` | `#10B981` | Goal met, streak alive — **fill only, pair with dark text/icon** |
| `--color-danger` *(assumption)* | `#DC2626` | `#F87171` | Destructive actions, save failures |

Never hard-code these hexes in components — reference the CSS variable /
Tailwind theme token, exactly as already wired up in
`frontend/src/styles/theme.css`.

### Typography *(assumption)*
System font stack for zero load cost and full Czech diacritic support:
`ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif`. Scale:

| Role | Size / line-height | Weight |
|---|---|---|
| Hero number (progress ring, big stat) | 48px / 1.1 | 700 |
| H1 (screen title) | 28px / 1.2 | 600 |
| H2 (card/section title) | 20px / 1.3 | 600 |
| Body | 16px / 1.5 | 400 |
| Small / caption | 13px / 1.4 | 400–500 |

### Spacing, radius, elevation *(assumption)*
- **Spacing scale:** 4px base — 4, 8, 12, 16, 24, 32, 48, 64.
- **Corner radius:** `sm` 6px (inputs, badges), `md` 12px (cards, buttons),
  `lg` 20px (modals), `full` (avatars, the "+" FAB, pill badges) — matches
  the brief's "modern, rounded, card-based" direction.
- **Elevation:** flat page background (0); cards use a soft 1-level shadow
  (`0 1px 3px rgba(0,0,0,.08)`); modals/menus use a stronger 2-level shadow
  (`0 8px 24px rgba(0,0,0,.16)`) plus a scrim behind modals.

### Light/dark handling
CSS-variable theme tokens switched via a `data-theme` attribute on the root
element (already implemented). Preference is saved per user (Profile &
settings) and defaults to the OS preference on first load. Celebratory motion
(tail-wag/confetti burst on crossing 100 points) plays identically in both
themes, respecting `prefers-reduced-motion` (skip/shorten the animation).

---

## Components

Inventory — build each as a variant-driven, themeable component:

| Component | Variants | States |
|---|---|---|
| Button | primary, secondary, ghost, danger, icon-only, FAB ("+") | default, hover, focus-visible, active, disabled, loading (spinner replaces label) |
| Input (text/number) | with unit suffix (km, reps…), with icon | default, focus, invalid (amber border + inline message), disabled |
| Select / dropdown | searchable (activity picker), plain (preset values) | default, open, disabled |
| Segmented control | 2–3 options (log-activity mode switch) | default, selected, disabled |
| Toggle / switch | e.g. stroller flag, theme switch | on, off, disabled |
| Date picker | single date, bounded to open week | default, disabled dates |
| Progress ring | animated fill 0–100%+ | in-progress, goal-met (success colour + celebration), overflow (>100) |
| Card | stat card, record card, challenge banner, member row | default, highlighted (current user), skeleton |
| Table / ranked list | desktop table ↔ mobile stacked cards | default row, current-user row (highlighted), empty |
| Badge / pill | rank, division ("gauč"/"bouda"), streak flame, goal-met | — |
| Modal / dialog | Log activity, small forms (challenge create, member invite) | opening/closing transition, scrim |
| Toast / snackbar | success, error (with retry action) | entering, visible, dismissing |
| Empty state | icon/illustration + friendly copy + optional CTA | — |
| Skeleton loader | card skeleton, table-row skeleton, chart skeleton | shimmering |
| Avatar | with image, initials fallback | — |
| Nav bar | top bar (desktop), bottom tab bar (mobile) | active tab indicator |
| Language/theme switcher | menu or inline toggle | — |
| Chart wrapper (Recharts) | line (points over time), bar (day-of-week) | loading (skeleton), empty (no data) |
| Tooltip | hover/focus info (e.g. points formula) | — |

All interactive components must have a visible **focus-visible** ring
(2px, `--color-primary` at 100% opacity, 2px offset) distinct from hover.

---

## States

Every data-driven screen needs explicit empty / loading / error handling.
Use the exact bilingual copy from the brief (§18) where given.

| Screen | Empty | Loading | Error |
|---|---|---|---|
| Dashboard | New member/new week: zeroed ring + "Vítej ve smečce! Zapiš první aktivitu. / Welcome to the pack! Log your first activity." | Skeleton cards (ring, stat chips, banner) — no spinners | Toast: generic "couldn't load your dashboard" + retry |
| Log activity (NL mode) | — | Inline "Očichávám… / Sniffing…" with 8s cap | "AI teď nemá čich. Zapiš aktivitu ručně. / The AI's nose is off right now — log it manually." → auto-fallback to Detailed |
| Leaderboard | "Tento týden ještě nikdo nezaběhl. Buď první. / No one's moved this week yet. Be first." | Skeleton table rows | Toast + retry, keep last-known data visible if present |
| My Stats | "Statistiky se objeví po prvním týdnu. / Your stats appear after your first week." | Skeleton cards + skeleton charts | Toast + retry |
| Challenges | "Tento týden bez výzvy. / No challenge this week." (+ setter prompt if it's their turn) | Skeleton banner + list | Toast + retry |
| Admin (any panel) | "No members/activities yet" (first-run) | Skeleton table | Save-failure toast with explicit retry; **no optimistic UI** — wait for confirmation before reflecting a write |
| Log activity — validation | — | — | Inline, amber field + "Zadej platnou hodnotu (větší než 0). / Enter a valid value (greater than 0)." Submit stays disabled until valid |
| Log activity — duplicate | — | — | Soft (non-blocking) warning: "Tohle už jsi dnes zapsal — přidat znovu? / You already logged this today — add again?" |

---

## Responsiveness

Mobile-first build; breakpoints follow Tailwind defaults — `sm` 640px, `md`
768px, `lg` 1024px, `xl` 1280px. Treat `lg` as the mobile↔desktop nav switch.

- **Dashboard:** mobile = single stacked column (ring → stat chips → banner
  → nothing else, "+" lives in the tab bar). Desktop ≥`lg` = two-column: ring
  + nudge on the left, stat chips and challenge banner stacked on the right;
  "Log activity" becomes a visible button in the header area.
- **Leaderboard:** mobile = stacked rank cards (avatar, name, total, badge
  stacked vertically per row). Desktop = full table with all columns inline.
- **My Stats:** mobile = single-column scroll of record cards then charts
  (full-width, stacked). Desktop = record cards in a 3-column grid, the two
  charts side by side below.
- **Challenges:** mobile = single column (banner, then submissions list).
  Desktop = two-column (challenge details + form on the left, live
  submissions/standings on the right).
- **Admin:** mobile = sub-nav becomes a horizontal scroll of tabs, tables
  become stacked cards with a "manage" affordance opening an edit sheet.
  Desktop = side sub-nav + full data tables.
- **Log activity modal:** full-screen sheet on mobile (slides up from
  bottom), centered dialog (max ~480px wide) on desktop.

---

## Accessibility

Concrete, testable targets:

- **Contrast (WCAG AA):** body text on background exceeds 15:1 in both
  themes — comfortably passes. `--color-accent` (amber) and `--color-success`
  (emerald) **fail AA as text color on the background** (≈2:1–2.5:1) — use
  them only as fills/badges with dark text/icon on top (dark-on-amber and
  dark-on-emerald both exceed 7:1). `--color-primary` as a background needs
  large text (≥24px / ≥19px bold) or an icon, not small body copy, when
  paired with white foreground (≈3.6:1, passes the 3:1 large-text/UI-component
  threshold but not the 4.5:1 body-text one).
- **Focus:** every interactive element has a visible focus-visible outline
  (see Components); never remove focus outlines without an equally visible
  replacement; focus order follows visual/DOM order; modals trap focus and
  return it to the trigger element on close.
- **Keyboard operability:** the entire app — including the Log activity
  modal, all three modes, and the Admin tables — must be fully operable
  without a mouse (tab, arrow keys within composite widgets like the
  segmented control and tabs, Enter/Space to activate, Escape to close
  modals).
- **Labels & semantics:** every input has a real associated `<label>` (not
  placeholder-only); icon-only buttons (nav, "+", theme switch) get an
  `aria-label`; the progress ring exposes its value via `aria-valuenow` /
  `aria-valuemax` or an equivalent text alternative; images/avatars get `alt`
  text (member name, or empty `alt=""` for pure decoration); toasts use
  `role="status"`/`aria-live="polite"` (assertive for errors).
- **Motion:** respect `prefers-reduced-motion` for the ring animation and
  celebration effect (crossfade or instant instead of tail-wag/confetti).
- **Language:** `lang` attribute on `<html>` updates with the active
  i18n language so screen readers pronounce Czech and English correctly.

---

## Backend touchpoints

Everything below is **TODO: connect to API**. Build every screen against a
local mock data layer (e.g. a `src/lib/mockApi.ts` returning these shapes
with a small artificial delay) so screens, states, and flows are fully
demoable before any real endpoint exists.

**Auth**
- `TODO: connect to API` — login, logout, invite-acceptance session.
  Mock current-user shape:
  ```ts
  interface CurrentUser {
    id: string
    displayName: string
    avatarUrl: string | null
    role: 'member' | 'admin'
    division: 'A' | 'B'
    languagePref: 'cs' | 'en'
    themePref: 'light' | 'dark'
  }
  ```

**Dashboard**
- `TODO: connect to API` — weekly summary.
  ```ts
  interface DashboardData {
    weeklyPoints: number       // e.g. 64
    weeklyGoal: 100
    roundTotal: number
    packRank: number
    packSize: number
    streakWeeks: number
    currentChallenge: { id: string; title: string; hasSubmitted: boolean } | null
  }
  ```

**Log activity**
- `TODO: connect to API` — activity rate table (read).
  ```ts
  interface Activity {
    id: string
    nameCs: string
    nameEn: string
    unit: string               // 'km' | 'rep' | 'min' | 'session' | ...
    hasElevationBonus: boolean
    hasStrollerOption: boolean
    isTiered: boolean
    tierOptions: number[] | null   // e.g. [5, 10, 15, 30]
    active: boolean
  }
  ```
- `TODO: connect to API` — submit a log entry (detailed/quick-add), returns
  the same preview shape used for confirmation.
  ```ts
  interface LogPreview {
    activityName: string
    quantity: number
    unit: string
    rawPoints: number
    coefficient: number
    finalPoints: number
  }
  ```
- `TODO: connect to API` — natural-language parse (mock with a fixed delay
  and an occasional simulated failure to build the fallback path). Returns
  one or more `LogPreview`-shaped entries.

**Leaderboard**
- `TODO: connect to API`
  ```ts
  interface LeaderboardRow {
    memberId: string
    displayName: string
    avatarUrl: string | null
    rank: number
    roundTotal: number
    goalMetThisWeek: boolean
    isCurrentUser: boolean
  }
  // GET returns { packA: LeaderboardRow[]; packB: LeaderboardRow[] }
  ```

**My Stats**
- `TODO: connect to API`
  ```ts
  interface StatsData {
    records: {
      bestWeek: number
      bestRoundFinish: string      // e.g. "2nd, Pack A"
      favouriteActivity: string
      lifetimePoints: number
      longestStreakWeeks: number
      totalKmAllTime: number
      weeksAtGoal: number
    }
    pointsOverTime: { date: string; points: number }[]
    pointsByDayOfWeek: { day: string; points: number }[]
    routineDetected: string | null   // e.g. "push-ups 18 of the last 21 mornings"
  }
  ```

**Challenges**
- `TODO: connect to API`
  ```ts
  interface ChallengeData {
    id: string | null
    title: string
    description: string
    deadline: string              // ISO datetime
    isSetterTurn: boolean
    submissions: { memberId: string; displayName: string; value: number; rank: number | null; bonusPoints: number }[]
  }
  ```
- `TODO: connect to API` — submit a value; create a challenge (setter only).

**Admin**
- `TODO: connect to API` — CRUD for members, activities, rounds, and
  challenge rotation order. Reuse the `Activity` and `CurrentUser`-like
  shapes above (extended with the fields an admin edits — division,
  coefficient, role, `injuryExemptUntil`, elevation/stroller rate fields,
  tier options, active flag) plus a generic
  `{ ok: true } | { ok: false; message: string }` response shape for every
  write, so the UI's save-confirmation/failure-toast pattern is consistent
  everywhere.
