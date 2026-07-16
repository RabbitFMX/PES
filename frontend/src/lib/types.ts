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

/* ---- Whole-pack comparison stats (Statistiky tab) ---- */

export interface PackAllTimeRow {
  memberId: string
  displayName: string
  avatarUrl: string | null
  division: Division
  lifetimePoints: number
  roundsPlayed: number
  wins: number
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

export interface LeaderboardRow {
  memberId: string
  displayName: string
  avatarUrl: string | null
  rank: number
  roundTotal: number
  goalMetThisWeek: boolean
  isCurrentUser: boolean
}

export interface LeaderboardData {
  packA: LeaderboardRow[]
  packB: LeaderboardRow[]
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
