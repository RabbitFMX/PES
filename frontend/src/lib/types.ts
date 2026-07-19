/**
 * Shared UI-facing types. These describe the shape of data the frontend
 * renders and expects to receive — NOT the database schema. Network calls go
 * through `lib/api.ts` (real backend), except the natural-language parse, which
 * stays a local mock until the LLM lands (seminar 6).
 */

export type Division = 'A' | 'B'
export type Role = 'member' | 'admin'
export type Lang = 'cs' | 'en'
export type ThemePref = 'light' | 'dark'
export type LogMode = 'detailed' | 'quick-add' | 'natural'

/** Generic write response so save-confirmation / failure-toast is uniform. */
export type ApiResult = { ok: true } | { ok: false; message: string }

export interface CurrentUser {
  id: string
  displayName: string
  email: string
  avatarUrl: string | null
  role: Role
  division: Division
  coefficient: number // 1.0 or 1.25 (fenčí koeficient), shown in point previews
  languagePref: Lang
  themePref: ThemePref
  analyticsConsent: boolean // account-level GDPR consent (per-browser choice is client-side)
  marketingConsent: boolean
}

export interface DashboardData {
  weeklyPoints: number
  weeklyGoal: number
  roundTotal: number
  packRank: number
  packSize: number
  streakWeeks: number
  currentChallenge: { id: string; title: string; hasSubmitted: boolean } | null
}

/* ---- Personal overview (Přehled tab + read-only member pages) ---- */

export interface OverviewActivityRef {
  activityId: string
  nameCs: string
  nameEn: string
}

export interface CurrentWeekActivity {
  activityName: string | null
  quantity: number
  unit: string
  elevationM: number
  points: number
  date: string
}

export interface MemberOverview {
  member: {
    id: string
    displayName: string
    avatarUrl: string | null
    division: Division
    isHistorical: boolean
  }
  weekly: { weeklyPoints: number; weeklyGoal: number; streakWeeks: number }
  currentWeekActivities: CurrentWeekActivity[]
  records: {
    lifetimePoints: number
    roundsPlayed: number
    bestWeek: number
    longestStreakWeeks: number
    weeksAtGoal: number
    weeksBelowGoal: number
    weeksLogged: number
    avgWeeklyPoints: number
    favouriteActivity: string
    totalKm: number
    totalElevation: number
  }
  bestWeekDetail: {
    roundName: string
    weekNumber: number
    weekStart: string
    points: number
    activities: { activityId: string | null; activityName: string | null; points: number }[]
  } | null
  /** All lifetime points split by activity (incl. a quick-add bucket) — for the pie. */
  pointsByActivity: (OverviewActivityRef & { points: number })[]
  topActivities: (OverviewActivityRef & { points: number })[]
  roundHistory: { roundId: string; name: string; total: number }[]
  pointsByDayOfWeek: { day: string; points: number }[]
  distanceByActivity: (OverviewActivityRef & { km: number })[]
  elevationByActivity: (OverviewActivityRef & { m: number })[]
  cumulative: { weekStart: string; km: number; elevation: number }[]
}

export interface MemberDirectoryEntry {
  id: string
  displayName: string
  avatarUrl: string | null
  division: Division
  status: MemberStatus
  isHistorical: boolean
  lifetimePoints: number
}

/* ---- Whole-pack comparison stats (Statistiky tab) ---- */

export interface PackTopActivity {
  activityId: string
  nameCs: string
  nameEn: string
  points: number
}

export interface PackAllTimeRow {
  memberId: string
  displayName: string
  avatarUrl: string | null
  division: Division
  lifetimePoints: number
  roundsPlayed: number
  wins: number
  topActivities: PackTopActivity[]
}

export interface PackRoundRow {
  roundId: string
  name: string
  status: RoundStatus
  startDate: string
  groupTotal: number
  participants: number
  winner: { memberId: string; displayName: string; total: number } | null
}

export interface PackMemberRoundTotals {
  memberId: string
  displayName: string
  totals: (number | null)[]
}

/** Per-week per-member points for one round (compare-by-week chart). */
export interface PackWeekly {
  roundId: string
  roundName: string
  weeks: { weekNumber: number }[]
  members: { memberId: string; displayName: string; weekly: (number | null)[] }[]
}

export interface PackStats {
  totals: {
    rounds: number
    members: number
    allTimePoints: number
    currentRoundName: string | null
  }
  allTime: PackAllTimeRow[]
  rounds: PackRoundRow[]
  roundTotals: PackMemberRoundTotals[]
}

/**
 * Full activity as held by the (mock) rate table. The Log-activity UI reads a
 * subset; the Admin rate-table editor reads/writes all of it.
 */
export interface Activity {
  id: string
  nameCs: string
  nameEn: string
  unit: string // 'km' | 'rep' | 'min' | 'session' | 'pts' ...
  pointsPerUnit: number
  hasElevationBonus: boolean
  elevationBonusPer50m: number | null
  elevationBonusPer50mStroller: number | null
  hasStrollerOption: boolean
  strollerBaseRateOverride: number | null
  isTiered: boolean
  tierOptions: number[] | null
  notes: string | null
  active: boolean
}

export interface LogPreview {
  activityName: string
  quantity: number
  unit: string
  rawPoints: number
  coefficient: number
  finalPoints: number
  /**
   * The source input this preview was computed from. Carried so `commitEntries`
   * can POST the original input to the backend (which recomputes points) — the
   * display fields alone can't reconstruct it. Optional and ignored by the UI.
   */
  input?: LogInput
}

export interface DetailedLogInput {
  activityId: string
  quantity: number
  elevationM?: number
  withStroller?: boolean
  activityDate?: string
  note?: string
}

export interface QuickAddInput {
  points: number
  note?: string
}
export type LogInput = DetailedLogInput | QuickAddInput

export interface LeaderboardActivityPoints {
  activityId: string | null // null = quick-add bucket
  nameCs: string
  nameEn: string
  points: number
}

export interface LeaderboardRow {
  memberId: string
  displayName: string
  avatarUrl: string | null
  rank: number
  roundTotal: number
  goalMetThisWeek: boolean
  isCurrentUser: boolean
  /** Per-activity points in the selected round (expandable breakdown). */
  pointsByActivity: LeaderboardActivityPoints[]
}

export interface LeaderboardData {
  roundId: string | null
  roundName: string
  isOpenRound: boolean
  packA: LeaderboardRow[]
  packB: LeaderboardRow[]
}

/** A round the member can browse in the leaderboard filter. */
export interface RoundOption {
  id: string
  name: string
  status: RoundStatus
  startDate: string
  endDate: string
}

export interface StatsRecords {
  bestWeek: number
  bestRoundFinish: string
  favouriteActivity: string
  lifetimePoints: number
  longestStreakWeeks: number
  totalKmAllTime: number
  weeksAtGoal: number
}

export interface StatsData {
  records: StatsRecords
  pointsOverTime: { date: string; points: number }[]
  pointsByDayOfWeek: { day: string; points: number }[]
  routineDetected: string | null
  currentWeekByDay: { day: string; points: number }[]
}

export interface ChallengeSubmissionRow {
  memberId: string
  displayName: string
  value: number
  rank: number | null
  bonusPoints: number
}

export interface ChallengeData {
  id: string | null
  title: string
  description: string
  deadline: string // ISO datetime
  isSetterTurn: boolean
  hasSubmitted: boolean
  submissions: ChallengeSubmissionRow[]
}

export interface PastChallenge {
  id: string
  title: string
  winner: string
  weekLabel: string
}

/* ---- Admin ---- */

export type MemberStatus = 'active' | 'left'

export interface Member {
  id: string
  displayName: string
  email: string
  division: Division
  coefficient: number
  role: Role
  status: MemberStatus
  injuryExemptUntil: string | null
  isHistorical: boolean
}

export type RoundStatus = 'upcoming' | 'open' | 'closed'

export interface Round {
  id: string
  name: string
  startDate: string
  endDate: string
  status: RoundStatus
}

export interface RotationEntry {
  memberId: string
  displayName: string
  orderPosition: number
}
