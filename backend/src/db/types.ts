/**
 * Row shapes as stored in Postgres (snake_case). These mirror the schema in
 * supabase/migrations. API/response types (camelCase) are defined in
 * src/schemas and mapped from these in the service layer.
 */

export interface ActivityRow {
  id: string
  name_cs: string
  name_en: string
  unit: string
  points_per_unit: number
  has_elevation_bonus: boolean
  elevation_bonus_per_50m: number | null
  elevation_bonus_per_50m_stroller: number | null
  has_stroller_option: boolean
  stroller_base_rate_override: number | null
  is_tiered: boolean
  tier_options: number[] | null
  notes: string | null
  active: boolean
}

export interface MemberRow {
  id: string
  name: string
  email: string
  gender: string | null
  coefficient: number
  division: 'A' | 'B'
  role: 'member' | 'admin'
  status: 'active' | 'left'
  joined_date: string
  avatar_url: string | null
  language_pref: 'cs' | 'en'
  theme_pref: 'light' | 'dark'
  injury_exempt_until: string | null
  /** True for spreadsheet-imported members with no login yet. Column has a DB
   *  default (false), so it is optional in constructed rows. */
  is_historical?: boolean
}

export interface RoundRow {
  id: string
  name: string
  start_date: string
  end_date: string
  status: 'upcoming' | 'open' | 'closed'
}

export interface WeekRow {
  id: string
  round_id: string
  week_number: number
  start_date: string
  end_date: string
}

export interface LogEntryRow {
  id: string
  member_id: string
  week_id: string
  activity_id: string | null // null for quick-add entries (no rate-table activity)
  activity_date: string
  quantity: number
  unit: string
  elevation_m: number | null
  with_stroller: boolean
  raw_points: number
  final_points: number
  source: 'manual' | 'quick-add' | 'llm'
  note: string | null
  created_at: string
}

/** Columns supplied when inserting a log entry (DB fills id/created_at). */
export type NewLogEntry = Omit<LogEntryRow, 'id' | 'created_at'>

export interface ChallengeRow {
  id: string
  week_id: string
  setter_member_id: string | null
  title: string
  description: string | null
  deadline: string | null
  status: 'open' | 'closed'
  created_at: string
  bonus_split: number[] | null // custom placement points; null → default 30/20/10
}

export interface ChallengeSubmissionRow {
  id: string
  challenge_id: string
  member_id: string
  value: number | null
  rank: number | null
  bonus_points: number
  submitted_at: string
}

/** Which division a member was in for a given (past) round. */
export interface MemberRoundDivisionRow {
  member_id: string
  round_id: string
  division: 'A' | 'B'
}
