# PES — Prostě Enormně Sexy — Project Brief (v3, consolidated build spec)

*This document merges the original brief (v1) and the post-interview update (v2) into a single source of truth. Where v2 corrected or confirmed something from v1, that version wins. Details that only existed in v1 (full feature specs, error states, user flow) are folded back in. This is meant to be handed to a coding agent to build the app from scratch.*

---

## 1. One-line description

A private, invite-only web app that turns our group's multi-year sport-activity spreadsheet into a motivating, gamified tracker where everyone can log activities, chase the weekly 100-point goal, and see where they stand in their pack.

## 2. Problem it solves

Our friend group has tracked sport activities for years in a shared Google Sheet — every activity has its own point rate, we split into two performance divisions, we run ~half-year rounds, and there are fines for missing the weekly goal. The sheet works but it's clumsy: hard to read on a phone, easy to enter points in the wrong place, no live ranking, no personal stats, nothing that motivates in the moment. The app keeps the exact same rules and point system but makes it pleasant, motivating, and mobile-friendly.

## 3. Target user

A closed, private group of friends (currently ~30 members, designed to scale beyond that) who already share a custom point-based activity competition. Everyone is a member; one or more are admins. Not a public product — no open signup, no public leaderboard.

## 4. How it differs from existing solutions

Not Strava or a generic fitness tracker. Built around *our own* invented scoring system: 35 custom activity types (confirmed, see §12) with our own point rates, a female coefficient (fenčí koeficient ×1.25), two divisions with promotion/relegation (Smečka A "gauč" / Smečka B "bouda"), ~24–26 week rounds, a weekly 100-point goal, rotating challenges, and a travelling trophy. The wedge is a private, closed-group app that mirrors *our specific ritual*, not distance or GPS. No other app models this.

---

## 5. Tech stack & repository structure

- `frontend/` — React + Vite + Tailwind CSS + TypeScript; Recharts for charts (points-over-time, stat cards, day-of-week bars); `react-i18next` for Czech/English internationalisation (Czech default, English available); React Router. Responsive single web app — desktop-first layout, fully usable on mobile browsers.
- `backend/` — Node + Express + TypeScript (one language across the whole app); Zod for request/schema validation.
- **Database:** PostgreSQL via Supabase (hosted Postgres + auth + storage on the free tier) — confirmed.
- **LLM:** Anthropic SDK, Claude Haiku (cheapest fast tier) — confirmed. Use **tool-forced JSON output** rather than free-form JSON parsing: define a `log_activities` tool whose schema only accepts a numbered index into the live active-activity list, so the model cannot invent an activity or a rate. Validate the result with Zod server-side before showing the preview.
- **Automation:** n8n for the weekly nudge workflow (trigger time and delivery channel still open — see §26).

## 6. Screens / pages

1. **Dashboard (home)** — weekly progress ring toward 100, round total, rank, streak, this week's challenge banner, big "Log activity" button.
2. **Log activity** — modal over the dashboard; manual picker OR free-text box, with a confirm-before-save preview.
3. **Leaderboard** — current round, tabbed Pack A / Pack B, rank + name + round total + weekly-goal status per row.
4. **My Stats** — long-term personal records, per-activity totals, all-time vanity numbers, day-of-week patterns, routine detection, plus browsing of past rounds/weeks.
5. **Challenges** — this week's challenge, submissions, standings, and the "it's your turn to set one" state.
6. **Admin** — members, divisions, coefficients, activity rate table (CS+EN, incl. tiered/preset and elevation-bonus fields), rounds, challenge order. Visible to admins only.

## 7. Navigation

Desktop: top nav bar (Dashboard · Leaderboard · Challenges · Stats), Log activity as a prominent button, Admin tucked in a profile/settings menu. Mobile: the same collapses to a bottom tab bar with a center "+" button for Log activity; Admin stays in the profile menu. Same screens, responsive breakpoints, single codebase.

## 8. Branding

- **App display name:** PES
- **Logo:** a clean, modern, single-colour geometric dog-paw / dog-silhouette mark (using `currentColor` so it themes correctly) that works as favicon, header mark, and mobile "+" accent. Build with an SVG placeholder first, swap for a designed one later.
- **Tone of voice:** professional and motivating with subtle dog-pack nods — light pack/dog metaphors, encouraging nudges, never overly cutesy. UI copy in the user's chosen language.
- **Slogan (optional):** *Prostě Enormně Sexy* (the tagline). Optional motivational sub-slogan: *Hýbej se, smečko.*

## 9. Colour scheme

Themeable via CSS variables / Tailwind theme tokens (never hard-coded hex in components) so more themes can be added easily. Ship with Light + Dark in v1; preference saved per user, switcher top-right.

**Light theme:**
- **Primary:** `#EA580C` — deep orange (app bar, key headings, logo)
- **Secondary:** `#1E293B` — slate blue (nav, text blocks, contrast)
- **Background:** `#FAFAF9` — warm off-white
- **Text:** `#0F172A` — near-black slate
- **Accent / CTA:** `#F59E0B` — amber (progress ring, "+" log button, celebrations)
- **Success:** `#10B981` — emerald (goal met, streak alive)
- **Style:** modern, rounded, card-based; big friendly hero numbers; prominent animated progress ring; subtle celebratory motion (tail-wag / confetti) on crossing 100. Premium-casual.

**Dark theme:** slate-black background, same orange primary and amber accent (they pop on dark), softened text. Additional seasonal/high-contrast themes are an easy future add.

## 10. Typical user flow

1. The user opens the app and sees their **personal dashboard** — the weekly progress ring (e.g. 64/100), their rank in their pack, their current 100+ streak, and this week's challenge banner.
2. They tap the center **"+"** button to open the **Log activity** modal.
3. They either pick an activity and enter distance/reps/time (with optional date, elevation, stroller), OR type free text like "ran 8k with 200m climb" for the LLM to parse.
4. The system calculates the points (applying their coefficient) and shows a **confirm-before-save preview** — e.g. "Běh 8 km + 200 m převýšení = 30 pts"; the user confirms.
5. Back on the dashboard the ring animates to the new total (e.g. 94/100) with a nudge ("6 points to go"), and they can tap through to the **Leaderboard** to see they've climbed a place.

## 11. Authentication and users

- **Login required:** yes.
- **Login method:** email + password via Supabase Auth. Google OAuth parked for v2.
- **User roles:** Member (logs own activities, sees everything, edits only their own data) and Admin (everything a member can do plus the admin panel).
- **First admin bootstrap — confirmed:** manually set `role = 'admin'` directly in the Supabase table editor as a one-time step. No seed script, no auto-admin-on-first-signup.
- **What a logged-out visitor sees:** only a login screen. Fully private — no public leaderboard.
- **Sign-up model:** invite-only — admin creates the account or sends an invite link, the member sets their own password and fills in their profile.

## 12. Data entered by the user

Activities (via detailed pick, quick-add points, or natural-language text), each with a quantity/unit and an activity date; optional elevation, stroller flag, and note. Challenge submissions. Profile details (display name, avatar, language and theme preference). Admins additionally enter/edit members, divisions, coefficients, the activity rate table, rounds, and the challenge-setter order.

---

## 13. Data model (build this schema from the start — includes the v2 corrections)

```
Member(id, name, email, password_hash, gender, coefficient, division, role, status,
       joined_date, avatar_url, language_pref, theme_pref, injury_exempt_until)

Activity(id, name_cs, name_en, unit, points_per_unit, has_elevation_bonus,
         elevation_bonus_per_50m, elevation_bonus_per_50m_stroller,
         stroller_base_rate_override, is_tiered, tier_options, notes, active)

Round(id, name, start_date, end_date, status)

Week(id, round_id, week_number, start_date, end_date)

LogEntry(id, member_id, week_id, activity_id, activity_date, quantity, unit,
         elevation_m, with_stroller, raw_points, final_points, source, note, created_at)

Challenge(id, week_id, setter_member_id, title, description, deadline, status)

ChallengeSubmission(id, challenge_id, member_id, value, rank, bonus_points, submitted_at)

ChallengeRotation(id, member_id, order_position)

MemberRoundDivision(member_id, round_id, division)
```

**Notes on fields (why they're there):**
- `coefficient` is 1.0 or 1.25 (fenčí koeficient), applied automatically at entry; `division` is A or B; `status` is active/left.
- `raw_points` is before coefficient, `final_points` after — kept separate so the app can show "24 ×1.25 = 30" transparently and recompute if a coefficient changes.
- `source` is manual / quick-add / llm. `activity_date` is the day the activity happened (drives routine detection); `created_at` is when it was entered.
- **Elevation/stroller bonuses are per-activity, not a single global formula.** Several activities also change their *base rate* (not just add a bonus) when `with_stroller` is true — e.g. túra goes from 1.5b/km to 2b/km with a child carrier. `elevation_bonus_per_50m` and `elevation_bonus_per_50m_stroller` cover the additive bonuses; `stroller_base_rate_override` covers the rate-change case. Do not build a single flat "+X points per 100m for everyone" formula — the real data in §12 does not support that.
- **Tiered/preset activities** (kayak, "various exercise," "various sports," Strava segment points, the legacy Ondra challenge bonus) don't fit quantity × rate. Use `is_tiered = true` with `tier_options` as a JSON array of point values, and render a preset-value dropdown in the Log activity UI instead of a numeric quantity field.
- `MemberRoundDivision(member_id, round_id, division)` records which division a member was actually in for each past round, so "best round finish" in My Stats reflects their real division at the time, not their current one.
- `injury_exempt_until` is a date field for the tribunal-approved illness/injury exemption. The approval *workflow* is out of scope for MVP (see §24), but the field should exist from day one because the n8n weekly-status endpoint (§20) needs to skip exempt members.
- `ChallengeRotation` stores the defined order admins set for who sets the weekly challenge next.
- Divisions, standings, promotion/relegation, dropped-worst-3, and the PSA-držák bonus are **computed** from these entities at query time, not stored as separate columns.

## 14. Activity rate table — source of truth (confirmed, from the real spreadsheet)

35 activities. Cycling is split into 4 separate rows; judgment-based entries use the detailed mode with a preset-value dropdown rather than quick-add; the legacy "Ondra-only" challenge bonus is kept as its own row.

| # | Activity (CS) | Activity (EN) | Unit / rate | Elevation or stroller notes | Logging mode |
|---|---|---|---|---|---|
| 1 | běh | Running | 3b/km | +1.5b/50m climb; +2.5b/50m with stroller | Detailed |
| 2 | túra | Hike | 1.5b/km (2b/km with child carrier — base rate changes, not just elevation) | +1b/50m climb; +2b/50m with stroller | Detailed |
| 3 | plavání | Swimming | 15b/km | — | Detailed |
| 4 | paddleboard | Paddleboarding | 4.5b/km | — | Detailed |
| 5 | kayak, canoe | Kayak / canoe | 1.5b/km (wild water) or 2.5b/km (calm water) | Rate depends on water type | Detailed, preset dropdown (1.5 / 2.5) |
| 6 | kolečkové brusle, koloběžka | Rollerblades / scooter | 1.25b/km | +1.5b/50m climb; +2.5b/50m with stroller | Detailed |
| 7 | kolo silnice | Road cycling | 0.7b/km | +1b/50m climb | Detailed |
| 8 | kolo gravel/cyklokros/trek | Gravel / cyclocross / trekking bike | 0.75b/km | +1b/50m climb | Detailed |
| 9 | kolo MTB | Mountain bike | 1b/km | +1b/50m climb | Detailed |
| 10 | kolo s kočárem | Cycling with stroller | 1.5b/km | +2b/50m climb | Detailed |
| 11 | běžky | Cross-country skiing | 1.5b/km | +1.5b/50m climb; note: sheet also lists "3b/km with stroller" — **ambiguous, confirm with the group before seeding (see §26)** | Detailed |
| 12 | skialpy | Ski touring | 2b/km | +1.5b/50m climb | Detailed |
| 13 | lyže/snowboard | Downhill ski / snowboard | 0.5b/km | Includes lift-assisted km; no elevation bonus | Detailed |
| 14 | tabata | Tabata | 4b/session | Reference video linked in-app | Detailed (count) |
| 15 | plank Sally | "Plank Sally" | 8b/rep | Reference video linked in-app | Detailed (count) |
| 16 | plank classic | Classic plank | 2b/min | — | Detailed |
| 17 | kliky | Push-ups | 1b/10 reps | Knee push-ups allowed | Detailed |
| 18 | dřepy | Squats | 1b/10 reps | — | Detailed |
| 19 | sedy/lehy | Sit-ups | 1b/15 reps | Other ab exercises allowed by group agreement | Detailed |
| 20 | mountain climber | Mountain climbers | 1b/15 reps | 1 rep = 1 leg movement | Detailed |
| 21 | výpady | Lunges | 1b/10 reps | 5+5 per leg | Detailed |
| 22 | zvedání pánve | Hip raises | 1b/25 reps | — | Detailed |
| 23 | angličáky bez kliku | Burpees (no push-up) | 1b/10 reps | — | Detailed |
| 24 | angličáky s klikem | Burpees (with push-up) | 1b/7 reps | — | Detailed |
| 25 | sklapovačky | V-ups | 1b/10 reps | — | Detailed |
| 26 | shyby | Pull-ups | 1b/4 reps | — | Detailed |
| 27 | dipy bradla | Dips | 1b/7 reps | — | Detailed |
| 28 | skrčky nohou bradla | Hanging leg raises | 1b/10 reps | — | Detailed |
| 29 | pozdrav Slunci | Sun salutation | 2b/rep | — | Detailed |
| 30 | cvičení různé | Various exercise (classes, gym, yoga, fitbox) | 5/10/15/30b per 30 min | Tier judged by effort | Detailed, preset dropdown |
| 31 | švihadlo | Jump rope | 1b/60s | — | Detailed |
| 32 | sporty různé | Various other sports | 5/10/15/30b per 30 min | Tier judged by effort | Detailed, preset dropdown |
| 33 | body STRAVA | Strava segment points | 1–30b | Based on segment placement; max 30b/week; deducted if later beaten | Detailed, preset dropdown |
| 34 | body závod | Race participation | 30b flat | Regardless of placement | Detailed |
| 35 | body výzva (jen pro Ondru) | Legacy per-person challenge bonus (Ondra only) | 10/20/30b | Kept as a separate row per group decision, even though the new Challenges feature covers this for everyone else | Detailed, preset dropdown |

## 15. House rules reference (confirmed, from the `pravidla` sheet)

Kept here as the canonical rulebook. Most of it is v2/later scope, but the MVP needs it to compute the weekly goal, round length, and challenge bonuses correctly.

**Scoring & deadlines**
- Scoring happens weekly, Sunday evening; hard deadline Sunday 21:00.
- Late entry (after 21:00) → 30 Kč fine *(fines ledger itself is out of scope for MVP, see §24)*.
- Activities should be logged as soon as possible after the activity; sharing on Strava is encouraged but not required.
- Activity point values can be revised after group discussion — this is exactly what the Admin panel's activity rate table editor is for.
- Values accumulate into a half-year (round) competition that determines final standings.
- New activities can be proposed by anyone.

**Illness / injury**
- Illness or injury is accepted as an exemption from fines for the necessary duration — but must be reported and approved by "the tribunal" (the organizers). The approval *workflow* is v2 scope; the `Member.injury_exempt_until` field should exist from the start (§13) so the weekly-status endpoint can already skip exempt members once someone sets the field manually.

**End-of-round mechanics** *(computed/manual for MVP, automation is v2 — see §24)*
- The 3 worst weekly scores are dropped at the end of each round (week 0 excluded).
- Bottom 3 of Pack A (gauč) relegate to Pack B; top 3 of Pack B (bouda) promote to Pack A.

**Challenges**
- Members rotate setting the weekly challenge, ideally by Sunday 21:00 — otherwise the turn is forfeited *(the forfeit penalty logic is v2; auto-rotation itself is in MVP)*.
- Bonus points: 30 / 20 / 10 for 1st / 2nd / 3rd place, unless the setter specifies otherwise.
- **Ties split the bonus points among the tied winners**, unless the setter says otherwise — build this into the Challenges feature from the start (see §22, Feature 5).

**Fines ("kasa")** — *out of scope for MVP, listed for context so the schema/logic isn't accidentally incompatible with it later*
- Missing the weekly 100-point goal: seasonal punishment + kasa contribution (winter: cold shower/pond dip with proof; summer: banana-with-peel, hot sauce, or litter collection with proof) + 50 Kč, repeating weekly until fulfilled.
- Withdrawing mid-round without a serious reason: 1000 Kč.
- Late entry: 30 Kč.
- End-of-round kasa scales with final placement per pack (Pack A: 100–500 Kč for 4th–8th; Pack B: 50–650 Kč for 4th–16th; 1st–3rd in both packs pay nothing).

**Rewards**
- Round winner receives the travelling trophy.
- PSA držák bonus: +300 lifetime points for a member who never scores a zero week *(v2 scope)*.
- Race participation and Strava segment bonuses are activity rows #33–34 (§14) rather than separate mechanics.

## 16. External data sources

The LLM API (for natural-language parsing and the weekly recap). No maps, weather, or scraping. Strava is not integrated in v1.

## 17. Output format for the user

On-screen: animated progress ring, leaderboard tables, stat cards, and simple charts (points over time, points by day of week). No PDF/CSV export in v1.

## 18. Error states

Copy is in the subtle dog-pack voice, shown in the user's chosen language (Czech / English).

- **Invalid user input:** inline validation before submit — the field turns amber with a message like "Zadej platnou hodnotu (větší než 0). / Enter a valid value (greater than 0)." Submit stays disabled until valid.
- **External API failure:** the LLM is only used in natural-language logging; if it times out or errors → graceful fallback to the manual picker with "AI teď nemá čich. Zapiš aktivitu ručně. / The AI's nose is off right now — log it manually." The app never hard-depends on the LLM. Weekly-recap (n8n) failures are invisible to users — handled in the workflow.
- **Empty state (no data):** friendly placeholders — new member: "Vítej ve smečce! Zapiš první aktivitu. / Welcome to the pack! Log your first activity." Leaderboard with nothing logged this week: "Tento týden ještě nikdo nezaběhl. Buď první. / No one's moved this week yet. Be first." My Stats with no history: "Statistiky se objeví po prvním týdnu. / Your stats appear after your first week." Challenges with none set: "Tento týden bez výzvy. / No challenge this week."
- **Slow loading:** skeleton screens (grey placeholder cards) for dashboard/leaderboard/stats, not spinners. LLM parse shows a brief inline "Očichávám… / Sniffing…" state with a hard timeout that triggers the manual fallback. Year-spanning stats are computed server-side and cached.

## 19. Smart features (LLM via API)

### Smart feature 1: Natural-language activity logging
- **What it does:** the member types (or dictates) a sentence like "ran 8k with 200m climb, then 50 pushups" and the LLM maps it to the activity rate table, returning structured data the app turns into points.
- **Input:** free text, ≤ 500 chars, one or several activities in one sentence. Works in either language ("ran 8k" or "8k běh" map to the same activity ID). Can parse relative dates ("yesterday") into `activity_date`.
- **Output:** a `log_activities` tool call whose schema only accepts a numbered index into the live active-activity list (never a free-text activity name), plus `quantity`, `unit`, optional `elevation_m`, `with_stroller`, `activity_date`. Zod-validated server-side against the live table, then shown as a preview the user confirms before saving. Never written straight to the DB.
- **Where it lives:** the Log activity modal, free-text mode.
- **Model and why:** Claude Haiku (or equivalent cheapest fast tier) — this is a simple mapping task, no heavy reasoning.
- **Prompt strategy:** system prompt containing the exact activity list + units + a few-shot example or two; tool-forced structured output (safer than freeform JSON mode, since the model literally cannot name an activity that doesn't exist).
- **Failure handling:** invalid tool call or out-of-range index → fall back to the manual picker (no bad data written). One LLM call, no default retries. Hard timeout: 8 seconds. Cost control: cheap model, called only when the user chooses free-text mode (the default manual path costs zero tokens), tiny prompts, single call.
- **Human in the loop:** always — the user reviews and edits the parsed preview before points are committed.

### Smart feature 2: Weekly AI recap
- **What it does:** generates a short, personalised, dog-pack-flavoured message for each member using their real numbers (e.g. "78/100 with a few hours left — one run closes it; morning push-ups on a roll, 18 days straight").
- **Input:** each member's weekly points, goal gap, streak, rank, recent daily pattern, and chosen language (pulled from `GET /api/weekly-status`).
- **Output:** 1–2 sentences of plain text per member, in the member's language.
- **Where it lives:** generated inside the n8n workflow, delivered via WhatsApp or Telegram (not a screen in the app).
- **Model and why:** same cheap tier; short generation task.
- **Prompt strategy:** short system prompt setting the voice + language; per-member data injected; batched over the group.
- **Failure handling:** one member's failure → skip and continue the batch; whole-step failure → workflow error branch (retry once, then alert admin). Cost control: cheap model, ~30 short calls/week, easy to toggle off.
- **Human in the loop:** not required (retrospective/motivational message, no data written).

## 20. AI workflow (n8n)

**Goal of the workflow:** every Sunday afternoon, before the 21:00 logging deadline, nudge each member toward the weekly 100-point goal with a personalised dog-pack message — directly tackling the real problem that people forget to log and get fined.

**Trigger:** Schedule (cron). **Time still undecided** — Sunday 17:00 is the working placeholder (see §26).

**Nodes, in order:**
1. **Trigger — cron.**
2. **HTTP Request → `GET /api/weekly-status`** — returns each active member's current week points, goal gap, streak, division rank, recent daily pattern, and chosen language. Skips members flagged ill/injured (`injury_exempt_until` in the future). Read-only endpoint built by the coding agent.
3. **Branch/filter** — split members into "already ≥100" (congrats / keep-going line) vs "under 100" (nudge with the exact gap).
4. **AI node** — cheap model, short output: 1–2 sentence personalised dog-pack message in the member's language, optionally referencing a routine streak.
5. **Delivery node** — send each member their message. **Channel still undecided** — WhatsApp Business Cloud API (needs a Meta developer app, phone number, and an approved template for proactive messages) vs. Telegram (simpler, no approval needed, good fallback). See §26.
6. **Log node → Google Sheets** — append what was sent (records + debugging).

**Connection to the app:** read-only in this direction — n8n calls `GET /api/weekly-status`; nothing writes back to the database, so the workflow cannot corrupt data.

**Error handling:** if the app API is down → retry once after a few minutes, then send the admin a single "recap failed this week" alert and stop. If the AI node fails for one member → skip that member and continue the rest.

**Runs:** weekly.

## 21. RAG / MCP / Autonomous agent assessment

**RAG — Verdict: Not needed.** PES data is structured and small — points, activities, weeks, members — which is a database problem. A SQL query plus a short prompt beats a vector store here in every respect. RAG earns its keep over large, growing piles of unstructured text; PES has none of that. The only free-text asset is the rules document, which is small enough to drop directly into a prompt if ever needed.

**MCP — Verdict: Nice-to-have later.** It's a genuine fit — the app is full of clean, discrete verbs (log activity, get my score, show leaderboard) which is exactly what MCP exposes well. But it's only worth building after the core app and its API exist. Tools it would expose: `log_activity`, `get_my_week`, `get_leaderboard`, `get_my_stats`, `set_challenge`.

**Autonomous agent — Verdict: Optional, later.** Promising specifically for PES because the app is already on WhatsApp/Telegram for the nudges — if the group lives in that chat anyway, being able to reply "zapiš 8k běh" and have it logged is exactly the capture-it-in-the-moment flow that drives motivation. It stacks on top of the MCP server and the n8n workflow, so it's the first post-launch project, not part of v1.

---

## 22. Feature specifications (build-ready)

### Feature 1: Log activity
- **Description:** a member records an activity in one of three modes on one screen — detailed (pick activity → quantity/unit → optional elevation/stroller/date → app calculates using the per-activity formula from §13/§14), quick-add (raw point total for edge cases), or natural-language (free text parsed by the LLM). All modes end in a confirm-before-save preview. Editable until the Sunday 21:00 deadline.
- **Input:** detailed — `activity_id` (active rate table), `quantity` (> 0), `unit` (auto), optional `elevation_m` (≥ 0), `with_stroller` (bool), `activity_date` (defaults today, editable within the open week); for tiered activities (kayak, various exercise/sports, Strava points, legacy Ondra bonus) — a preset-value dropdown instead of a numeric quantity; quick-add — `points` (> 0), optional `note`; natural-language — free text ≤ 500 chars.
- **Output:** a preview card showing the parsed activity, quantity, `raw_points`, the ×coefficient applied, and `final_points`. On confirm → one or more `LogEntry` rows saved; dashboard ring animates to the new weekly total.
- **Where it's used:** center "+" button (mobile) / prominent button (desktop) → modal over the dashboard.
- **Dependencies:** Activity rate table (read, incl. elevation/stroller/tier fields); Member.coefficient (read); the current open Week; LLM tool call (natural-language mode only).
- **Edge cases:**
  - Empty input: submit disabled until a valid quantity/points/preset value exists; friendly inline hint.
  - Wrong format: non-numeric/negative → amber inline validation, no submit; LLM invalid tool call or out-of-range index → fall back to manual picker, no bad data written.
  - External service doesn't respond: LLM timeout (8s hard cap) → manual picker stays fully available; app never hard-depends on the LLM.
  - Duplicate data: same activity/quantity/date submitted twice quickly → soft warning "Tohle už jsi dnes zapsal — přidat znovu? / You already logged this today — add again?" (allowed but flagged).

### Feature 2: Personal dashboard
- **Description:** the landing screen; a member's at-a-glance motivational hub for the current week.
- **Input:** none directly — reads the member's current-week `LogEntry` rows, streak, rank, and this week's challenge.
- **Output:** animated progress ring (weekly points / 100), round total, current rank in the member's pack, current 100+ streak, this week's challenge banner, and a prominent Log activity button. A contextual nudge ("6 points to go").
- **Where it's used:** home route after login.
- **Dependencies:** LogEntry, Week, Round, Member, Challenge (all read); computed weekly total and rank.
- **Edge cases:**
  - Empty input: brand-new member / new week with nothing logged → welcome empty state and a zeroed ring.
  - Wrong format: n/a (read-only screen).
  - External service doesn't respond: if aggregation is slow → skeleton screen; data is server-side/cached.
  - Duplicate data: standings are computed, so duplicates surface as higher totals until edited — the Log activity duplicate warning is the guard.

### Feature 3: My Stats
- **Description:** long-term personal records and behavioural patterns powered by the full imported history.
- **Input:** none directly — aggregates all of the member's `LogEntry` rows across rounds.
- **Output:** record cards (most points in a week, best round total/finish — using `MemberRoundDivision` for the correct historical division, favourite activity, points per activity type, longest distance per discipline, lifetime points, weeks with 100+, longest streak, total km all-time), a day-of-week points chart, routine detection ("push-ups 18 of the last 21 mornings"), a current-week day-by-day breakdown, and browsing of past rounds/weeks.
- **Where it's used:** Stats tab.
- **Dependencies:** LogEntry (read, all-time), Activity, Round, Week, MemberRoundDivision; computed aggregates, cached server-side.
- **Edge cases:**
  - Empty input: no history yet → friendly placeholder, no broken charts.
  - Wrong format: n/a.
  - External service doesn't respond: slow aggregation → skeleton screen; cached results.
  - Duplicate data: reflected in totals until corrected at source; routine detection uses distinct `activity_date` days to avoid double-count inflation.

### Feature 4: Leaderboard
- **Description:** live current-round rankings, split by pack.
- **Input:** none directly — reads all members' current-round totals.
- **Output:** two tabs (Pack A / Pack B), each a ranked table of rank, name, round total, and weekly-goal status.
- **Where it's used:** Leaderboard tab.
- **Dependencies:** Member, LogEntry, Round, Week; computed standings.
- **Edge cases:**
  - Empty input: nobody logged this week/round yet → "be first" empty state.
  - Wrong format: n/a.
  - External service doesn't respond: skeleton screen; cached standings.
  - Duplicate data: computed totals reflect duplicates until edited at source.

### Feature 5: Challenges
- **Description:** the weekly challenge — the current setter (auto-rotated in a defined order via `ChallengeRotation`) posts one; members submit; winners earn +30/+20/+10 bonus points toward the weekly total and round.
- **Input:** setter provides title, description, deadline; members submit a value / mark done.
- **Output:** the current challenge, the submissions list, ranked results with bonus points applied, and an "it's your turn to set one" prompt for the current setter.
- **Where it's used:** Challenges tab; a banner on the dashboard.
- **Dependencies:** Challenge, ChallengeSubmission, Member, Week, ChallengeRotation.
- **Edge cases:**
  - Empty input: no challenge set this week → "no challenge this week" state (plus a prompt if it's your turn).
  - Wrong format: invalid submission value → inline validation.
  - External service doesn't respond: n/a (no external service); standard skeleton on load.
  - Duplicate data: a member submitting twice → keep the latest / flag; bonus points awarded once per member per challenge.
  - **Ties:** if two or more members tie for a placement, split that placement's bonus points evenly among them, unless the setter specified otherwise when creating the challenge.

### Feature 6: Admin panel
- **Description:** admin-only management of everything that members shouldn't touch.
- **Input:** member invites/removals, division and coefficient assignments, role grants, `injury_exempt_until` date; activity rate-table edits (CS + EN names, rate, unit, elevation-bonus fields, tiered flag + preset values, active); round open/close; challenge-setter order.
- **Output:** confirmation of each change; updated tables reflected across the app immediately.
- **Where it's used:** Admin section, reached from the profile menu; hidden from members.
- **Dependencies:** all core entities (write); guarded by the admin role.
- **Edge cases:**
  - Empty input: required fields validated before save.
  - Wrong format: non-numeric rate / missing translation → inline validation; both `name_cs` and `name_en` required for a new activity; tiered activities require at least one `tier_options` value.
  - External service doesn't respond: standard save-failure toast with retry; no partial writes.
  - Duplicate data: prevent duplicate emails on invite; warn on a duplicate activity name within a language.

---

## 23. MVP scope

**In scope (build all of this):** Log activity (all 3 modes), Personal dashboard, My Stats, Leaderboard, Challenges (incl. rotation and tie-break), Admin panel, natural-language logging via Claude Haiku, the full 35-activity rate table with correct per-activity elevation/stroller/tiered logic, Light+Dark theming, CS/EN i18n, email+password auth with manual first-admin bootstrap.

## 24. Out of scope for MVP

- **Kasa / fines ledger** (CZK fine tally, seasonal punishments, late-entry fines) — v2.
- **Automated promotion/relegation** at round end (bottom 3 of Pack A relegate, top 3 of Pack B promote) — v2; computed/manual for now.
- **Automatic "drop worst 3 weekly scores"** (excludes week 0) — v2.
- **"Challenge advantage forfeited after Sunday 21:00"** penalty — v2 (auto-rotation itself is in MVP).
- **PSA držák bonus** (+300 lifetime points for never scoring a zero week) — v2.
- **Illness/injury tribunal approval workflow** — v2. The `injury_exempt_until` field exists from day one (§13) so it can be set manually by an admin even before the full approval workflow exists.
- **Events, Strava API integration, PDF/CSV export, public read-only leaderboard, Google OAuth** — v2 niceties.

## 25. Confirmed build decisions (reference log — don't re-litigate these)

| Topic | Decision |
|---|---|
| First admin bootstrap | Manually set `role='admin'` directly in Supabase (one-time) |
| ×1.25 coefficient on quick-add | Applies to quick-add too |
| Elevation bonus formula | Per-activity, not global — see §13/§14; several activities also change base rate (not just add a bonus) when `with_stroller` is true |
| Cycling rate variants | Modeled as 4 separate activities (road / gravel-cyclocross-trek / MTB / with-stroller), not one activity with a type selector |
| Judgment-based entries (kayak, exercise tiers, Strava points) | Detailed mode with a preset-value dropdown, not quick-add and not a freeform quantity × rate |
| "body výzva (jen pro Ondru)" | Kept as its own activity row, despite being largely superseded by the new Challenges feature |
| Historical division tracking for best-round "finish" | Needs per-round division tracking (`MemberRoundDivision`) — a simplified "current division" lookup was rejected as inaccurate |
| Natural-language logging implementation | Tool-forced JSON (numbered index into active activity list), not freeform JSON mode — prevents the model from inventing activities |

## 26. Open questions to resolve before/during build

- **n8n trigger day/time** — placeholder: Sunday 17:00. Confirm before building the workflow.
- **n8n delivery channel** — WhatsApp Business Cloud API (needs Meta app + approved template) vs. Telegram (simpler, no approval). Confirm before building; Telegram is the safer default to start with if this isn't decided yet.
- **běžky (cross-country skiing) elevation-with-stroller rate** — the source sheet's "3b/km with stroller" note reads like it may be a typo. Confirm the real rate with the group before seeding the activity table; seed with the ambiguous placeholder flagged in an admin-visible note in the meantime.
