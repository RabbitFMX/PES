/**
 * Mock API layer — the ONLY place the frontend "talks to a backend" in this
 * phase. Every function here is a `TODO: connect to API`; each returns the
 * shape the real endpoint will return, after a small artificial delay so
 * loading/skeleton states are exercised.
 *
 * Nothing outside this file should know the data is fake.
 */
import type {
  Activity,
  ApiResult,
  ChallengeData,
  CurrentUser,
  DashboardData,
  DetailedLogInput,
  LeaderboardData,
  LogPreview,
  Member,
  PastChallenge,
  QuickAddInput,
  Round,
  RotationEntry,
  StatsData,
} from './types'
import { applyCoefficient, computeRawPoints } from './mockPoints'

const LATENCY_MS = 500

function delay<T>(value: T, ms = LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/* ------------------------------------------------------------------ */
/* Seed data                                                           */
/* ------------------------------------------------------------------ */

/**
 * A representative slice of the 35-activity rate table (project-brief.md §14),
 * chosen to exercise every Log-activity UI path. The full table is managed via
 * the Admin rate-table editor / real API.
 *
 * NOTE: kayak/canoe (brief §14 row 5, §26) is genuinely ambiguous — the sheet
 * lists it as a per-km rate (1.5 wild / 2.5 calm) yet tags it "preset
 * dropdown". Modelled here as a plain distance activity at the calm-water rate
 * with the split recorded in `notes`; confirm with the group before seeding
 * the real table.
 */
export const MOCK_ACTIVITIES: Activity[] = [
  a('run', 'běh', 'Running', 'km', 3, { elev: 1.5, elevStroller: 2.5, stroller: true }),
  a('hike', 'túra', 'Hike', 'km', 1.5, {
    elev: 1,
    elevStroller: 2,
    stroller: true,
    strollerBase: 2,
    notes: 'Base rate 2 b/km with a child carrier.',
  }),
  a('swim', 'plavání', 'Swimming', 'km', 15),
  a('paddleboard', 'paddleboard', 'Paddleboarding', 'km', 4.5),
  a('kayak', 'kayak, canoe', 'Kayak / canoe', 'km', 2.5, {
    notes: 'Calm water 2.5 b/km, wild water 1.5 b/km — confirm handling (brief §26).',
  }),
  a('skates', 'kolečkové brusle, koloběžka', 'Rollerblades / scooter', 'km', 1.25, {
    elev: 1.5,
    elevStroller: 2.5,
    stroller: true,
  }),
  a('bike-road', 'kolo silnice', 'Road cycling', 'km', 0.7, { elev: 1 }),
  a('bike-mtb', 'kolo MTB', 'Mountain bike', 'km', 1, { elev: 1 }),
  a('skitour', 'skialpy', 'Ski touring', 'km', 2, { elev: 1.5 }),
  a('downhill', 'lyže/snowboard', 'Downhill ski / snowboard', 'km', 0.5, {
    notes: 'Includes lift-assisted km; no elevation bonus.',
  }),
  a('tabata', 'tabata', 'Tabata', 'session', 4, { notes: 'Reference video linked in-app.' }),
  a('plank', 'plank classic', 'Classic plank', 'min', 2),
  a('pushups', 'kliky', 'Push-ups', '10 reps', 1, { notes: 'Knee push-ups allowed.' }),
  a('squats', 'dřepy', 'Squats', '10 reps', 1),
  a('pullups', 'shyby', 'Pull-ups', '4 reps', 1),
  a('jumprope', 'švihadlo', 'Jump rope', '60 s', 1),
  a('race', 'body závod', 'Race participation', 'race', 30, {
    notes: 'Flat 30 b regardless of placement.',
  }),
  tiered('exercise', 'cvičení různé', 'Various exercise', [5, 10, 15, 30]),
  tiered('sports', 'sporty různé', 'Various other sports', [5, 10, 15, 30]),
  tiered('strava', 'body STRAVA', 'Strava segment points', [5, 10, 20, 30]),
  tiered('ondra', 'body výzva (jen pro Ondru)', 'Legacy challenge bonus (Ondra)', [10, 20, 30]),
]

interface RateOpts {
  elev?: number
  elevStroller?: number
  stroller?: boolean
  strollerBase?: number
  notes?: string
}

function a(
  id: string,
  nameCs: string,
  nameEn: string,
  unit: string,
  pointsPerUnit: number,
  opts: RateOpts = {},
): Activity {
  return {
    id,
    nameCs,
    nameEn,
    unit,
    pointsPerUnit,
    hasElevationBonus: opts.elev != null,
    elevationBonusPer50m: opts.elev ?? null,
    elevationBonusPer50mStroller: opts.elevStroller ?? null,
    hasStrollerOption: Boolean(opts.stroller),
    strollerBaseRateOverride: opts.strollerBase ?? null,
    isTiered: false,
    tierOptions: null,
    notes: opts.notes ?? null,
    active: true,
  }
}

function tiered(id: string, nameCs: string, nameEn: string, tierOptions: number[]): Activity {
  return {
    id,
    nameCs,
    nameEn,
    unit: 'pts',
    pointsPerUnit: 0,
    hasElevationBonus: false,
    elevationBonusPer50m: null,
    elevationBonusPer50mStroller: null,
    hasStrollerOption: false,
    strollerBaseRateOverride: null,
    isTiered: true,
    tierOptions,
    notes: 'Preset point value — tier judged by effort.',
    active: true,
  }
}

const MOCK_USER: CurrentUser = {
  id: 'me',
  displayName: 'Bára Nováková',
  email: 'bara@pes.dev',
  avatarUrl: null,
  role: 'member',
  division: 'A',
  coefficient: 1.25,
  languagePref: 'cs',
  themePref: 'light',
}

const MOCK_MEMBERS: Member[] = [
  m('me', 'Bára Nováková', 'bara@pes.dev', 'A', 1.25, 'member'),
  m('ondra', 'Ondra Dvořák', 'ondra@pes.dev', 'A', 1.0, 'admin'),
  m('petr', 'Petr Svoboda', 'petr@pes.dev', 'A', 1.0, 'member'),
  m('klara', 'Klára Horáková', 'klara@pes.dev', 'A', 1.25, 'member'),
  m('tomas', 'Tomáš Marek', 'tomas@pes.dev', 'B', 1.0, 'member'),
  m('eva', 'Eva Pokorná', 'eva@pes.dev', 'B', 1.25, 'member'),
  m('jan', 'Jan Kučera', 'jan@pes.dev', 'B', 1.0, 'member'),
]

function m(
  id: string,
  displayName: string,
  email: string,
  division: 'A' | 'B',
  coefficient: number,
  role: 'member' | 'admin',
): Member {
  return {
    id,
    displayName,
    email,
    division,
    coefficient,
    role,
    status: 'active',
    injuryExemptUntil: null,
  }
}

const MOCK_ROUNDS: Round[] = [
  {
    id: 'r-2026-h1',
    name: 'Round 12 — Spring 2026',
    startDate: '2026-01-05',
    endDate: '2026-06-28',
    status: 'open',
  },
  {
    id: 'r-2025-h2',
    name: 'Round 11 — Autumn 2025',
    startDate: '2025-07-07',
    endDate: '2025-12-28',
    status: 'closed',
  },
  {
    id: 'r-2025-h1',
    name: 'Round 10 — Spring 2025',
    startDate: '2025-01-06',
    endDate: '2025-06-29',
    status: 'closed',
  },
]

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

// TODO: connect to API — login / logout / invite-acceptance session.
export function login(email: string, _password: string): Promise<CurrentUser> {
  const isAdmin = email.toLowerCase().includes('admin') || email.toLowerCase().startsWith('ondra')
  return delay({
    ...MOCK_USER,
    email,
    role: isAdmin ? 'admin' : 'member',
    displayName: isAdmin ? 'Ondra Dvořák (admin)' : MOCK_USER.displayName,
  })
}

// TODO: connect to API — resume session on load. Returns null when logged out.
export function getSession(): Promise<CurrentUser | null> {
  return delay(null, 150)
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

// TODO: connect to API — current-week summary for the logged-in member.
export function getDashboard(): Promise<DashboardData> {
  return delay({
    weeklyPoints: 64,
    weeklyGoal: 100,
    roundTotal: 1284,
    packRank: 3,
    packSize: 8,
    streakWeeks: 6,
    currentChallenge: { id: 'ch-1', title: 'Nejvíc kliků do neděle', hasSubmitted: false },
  })
}

/* ------------------------------------------------------------------ */
/* Log activity                                                        */
/* ------------------------------------------------------------------ */

// TODO: connect to API — active rate table (read).
export function getActivities(): Promise<Activity[]> {
  return delay(MOCK_ACTIVITIES.filter((x) => x.active))
}

// TODO: connect to API — submit a detailed log entry, returns the preview.
export function previewDetailed(input: DetailedLogInput): Promise<LogPreview> {
  const activity = MOCK_ACTIVITIES.find((x) => x.id === input.activityId)
  if (!activity) return Promise.reject(new Error('unknown_activity'))
  const raw = computeRawPoints(activity, input.quantity, input.elevationM ?? 0, input.withStroller)
  const coefficient = MOCK_USER.coefficient
  return delay({
    activityName: activity.nameCs,
    quantity: input.quantity,
    unit: activity.unit,
    rawPoints: raw,
    coefficient,
    finalPoints: applyCoefficient(raw, coefficient),
  })
}

// TODO: connect to API — submit a quick-add entry, returns the preview.
export function previewQuickAdd(input: QuickAddInput): Promise<LogPreview> {
  const coefficient = MOCK_USER.coefficient
  return delay({
    activityName: 'Rychlý zápis',
    quantity: input.points,
    unit: 'pts',
    rawPoints: input.points,
    coefficient,
    finalPoints: applyCoefficient(input.points, coefficient),
  })
}

/**
 * TODO: connect to API — natural-language parse (Claude Haiku, tool-forced).
 * Mock behaviour: succeeds for text containing a number; throws when the text
 * contains "fail" (a deterministic hook so the failure/fallback path is easy
 * to demo and test). Delays ~1.2s to show the "Sniffing…" state.
 */
export function parseNaturalLanguage(text: string): Promise<LogPreview[]> {
  if (/fail/i.test(text) || !/\d/.test(text)) {
    return new Promise((_resolve, reject) =>
      setTimeout(() => reject(new Error('llm_unavailable')), 900),
    )
  }
  const coefficient = MOCK_USER.coefficient
  const km = Number(text.match(/(\d+(?:\.\d+)?)\s*k/i)?.[1] ?? 5)
  const run = MOCK_ACTIVITIES[0]
  const raw = computeRawPoints(run, km)
  return delay(
    [
      {
        activityName: run.nameCs,
        quantity: km,
        unit: run.unit,
        rawPoints: raw,
        coefficient,
        finalPoints: applyCoefficient(raw, coefficient),
      },
    ],
    1200,
  )
}

// TODO: connect to API — persist confirmed entries; returns updated weekly total.
export function commitEntries(_previews: LogPreview[]): Promise<{ weeklyPoints: number }> {
  return delay({ weeklyPoints: 94 })
}

/* ------------------------------------------------------------------ */
/* Leaderboard                                                         */
/* ------------------------------------------------------------------ */

// TODO: connect to API — current-round standings, split by pack.
export function getLeaderboard(): Promise<LeaderboardData> {
  return delay({
    packA: [
      row('klara', 'Klára Horáková', 1, 1710, true),
      row('ondra', 'Ondra Dvořák', 2, 1502, true),
      row('me', 'Bára Nováková', 3, 1284, false, true),
      row('petr', 'Petr Svoboda', 4, 1090, false),
    ],
    packB: [
      row('eva', 'Eva Pokorná', 1, 980, true),
      row('tomas', 'Tomáš Marek', 2, 845, false),
      row('jan', 'Jan Kučera', 3, 612, false),
    ],
  })
}

function row(
  memberId: string,
  displayName: string,
  rank: number,
  roundTotal: number,
  goalMetThisWeek: boolean,
  isCurrentUser = false,
) {
  return {
    memberId,
    displayName,
    avatarUrl: null,
    rank,
    roundTotal,
    goalMetThisWeek,
    isCurrentUser,
  }
}

/* ------------------------------------------------------------------ */
/* My Stats                                                            */
/* ------------------------------------------------------------------ */

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// TODO: connect to API — aggregated stats for a member and round.
export function getStats(_roundId?: string): Promise<StatsData> {
  return delay({
    records: {
      bestWeek: 212,
      bestRoundFinish: '2nd, Pack A',
      favouriteActivity: 'Běh',
      lifetimePoints: 18422,
      longestStreakWeeks: 14,
      totalKmAllTime: 1043,
      weeksAtGoal: 61,
    },
    pointsOverTime: [
      { date: '2026-01-11', points: 104 },
      { date: '2026-01-18', points: 88 },
      { date: '2026-01-25', points: 132 },
      { date: '2026-02-01', points: 97 },
      { date: '2026-02-08', points: 156 },
      { date: '2026-02-15', points: 121 },
    ],
    pointsByDayOfWeek: [
      { day: DOW[0], points: 42 },
      { day: DOW[1], points: 18 },
      { day: DOW[2], points: 55 },
      { day: DOW[3], points: 22 },
      { day: DOW[4], points: 30 },
      { day: DOW[5], points: 61 },
      { day: DOW[6], points: 48 },
    ],
    routineDetected: 'push-ups 18 of the last 21 mornings',
    currentWeekByDay: [
      { day: DOW[0], points: 30 },
      { day: DOW[1], points: 0 },
      { day: DOW[2], points: 22 },
      { day: DOW[3], points: 0 },
      { day: DOW[4], points: 12 },
      { day: DOW[5], points: 0 },
      { day: DOW[6], points: 0 },
    ],
  })
}

/* ------------------------------------------------------------------ */
/* Challenges                                                          */
/* ------------------------------------------------------------------ */

// TODO: connect to API — this week's challenge + submissions.
export function getChallenge(): Promise<ChallengeData> {
  return delay({
    id: 'ch-1',
    title: 'Nejvíc kliků do neděle',
    description: 'Kdo nasbírá nejvíc kliků do nedělního uzávěru. Koleno povoleno.',
    deadline: '2026-02-22T21:00:00+01:00',
    isSetterTurn: false,
    hasSubmitted: false,
    submissions: [
      { memberId: 'klara', displayName: 'Klára Horáková', value: 420, rank: 1, bonusPoints: 30 },
      { memberId: 'petr', displayName: 'Petr Svoboda', value: 355, rank: 2, bonusPoints: 20 },
      { memberId: 'ondra', displayName: 'Ondra Dvořák', value: 300, rank: 3, bonusPoints: 10 },
    ],
  })
}

// TODO: connect to API — past challenge results.
export function getPastChallenges(): Promise<PastChallenge[]> {
  return delay([
    { id: 'ch-0', title: 'Nejdelší běh', winner: 'Ondra Dvořák', weekLabel: 'Týden 6' },
    { id: 'ch--1', title: 'Nejvíc výškových metrů', winner: 'Bára Nováková', weekLabel: 'Týden 5' },
  ])
}

// TODO: connect to API — submit a value to the current challenge.
export function submitChallenge(_value: number): Promise<ApiResult> {
  return delay({ ok: true })
}

// TODO: connect to API — create this week's challenge (setter only).
export function createChallenge(_input: {
  title: string
  description: string
  deadline: string
}): Promise<ApiResult> {
  return delay({ ok: true })
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

// TODO: connect to API — admin CRUD. Reads return copies of the seed data.
export function getMembers(): Promise<Member[]> {
  return delay(MOCK_MEMBERS.map((x) => ({ ...x })))
}

export function saveMember(_member: Member): Promise<ApiResult> {
  return delay({ ok: true })
}

export function inviteMember(_email: string): Promise<ApiResult> {
  return delay({ ok: true })
}

export function getAdminActivities(): Promise<Activity[]> {
  return delay(MOCK_ACTIVITIES.map((x) => ({ ...x })))
}

export function saveActivity(_activity: Activity): Promise<ApiResult> {
  return delay({ ok: true })
}

export function getRounds(): Promise<Round[]> {
  return delay(MOCK_ROUNDS.map((x) => ({ ...x })))
}

export function saveRound(_round: Round): Promise<ApiResult> {
  return delay({ ok: true })
}

export function getRotation(): Promise<RotationEntry[]> {
  return delay(
    MOCK_MEMBERS.filter((x) => x.status === 'active').map((x, i) => ({
      memberId: x.id,
      displayName: x.displayName,
      orderPosition: i,
    })),
  )
}

export function saveRotation(_order: RotationEntry[]): Promise<ApiResult> {
  return delay({ ok: true })
}
