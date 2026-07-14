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
}

export interface RoundRow {
  id: string
  name: string
  start_date: string
  end_date: string
  status: 'open' | 'closed'
}

export interface WeekRow {
  id: string
  round_id: string
  week_number: number
  start_date: string
  end_date: string
}
