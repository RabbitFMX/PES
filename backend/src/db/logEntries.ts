import { supabase, type Supabase } from './supabaseClient'
import type { LogEntryRow, NewLogEntry } from './types'

/**
 * Query helpers for the `log_entry` table. Raw Supabase queries live here,
 * never in routes/services. The client is injectable so it can be mocked in
 * tests.
 */

/** Insert one or more log entries and return the saved rows. */
export async function insertLogEntries(
  rows: NewLogEntry[],
  client: Supabase = supabase,
): Promise<LogEntryRow[]> {
  const { data, error } = await client.from('log_entry').insert(rows).select('*')

  if (error) throw error
  return (data ?? []) as LogEntryRow[]
}

/** Sum of a member's final points within a week (their weekly total). */
export async function getWeeklyTotalPoints(
  memberId: string,
  weekId: string,
  client: Supabase = supabase,
): Promise<number> {
  const { data, error } = await client
    .from('log_entry')
    .select('final_points')
    .eq('member_id', memberId)
    .eq('week_id', weekId)

  if (error) throw error
  const rows = (data ?? []) as { final_points: number }[]
  const total = rows.reduce((sum, r) => sum + Number(r.final_points), 0)
  return Math.round(total * 100) / 100
}

/**
 * All entries across a set of weeks (a round), as the minimal columns standings
 * and streaks need: which member, which week, and the final points. One query
 * feeds every per-member and per-week aggregate the dashboard computes.
 */
export async function listRoundEntries(
  weekIds: string[],
  client: Supabase = supabase,
): Promise<{ member_id: string; week_id: string; final_points: number }[]> {
  if (weekIds.length === 0) return []

  const { data, error } = await client
    .from('log_entry')
    .select('member_id, week_id, final_points')
    .in('week_id', weekIds)

  if (error) throw error
  const rows = (data ?? []) as { member_id: string; week_id: string; final_points: number }[]
  // Numeric columns can arrive as strings from the driver — normalise.
  return rows.map((r) => ({ ...r, final_points: Number(r.final_points) }))
}

/**
 * One of a member's log entries with the joined bits the Stats aggregates need:
 * the activity's names and the entry's week (date, number, round). A single
 * indexed query (`log_entry_member_id_idx`) feeds every lifetime aggregate, so
 * the year-spanning stats stay one round-trip. `activity` is null for quick-add.
 */
export interface MemberStatEntry {
  activityDate: string
  quantity: number
  unit: string
  finalPoints: number
  weekId: string
  weekStartDate: string
  weekNumber: number
  roundId: string
  activityId: string | null
  activityNameCs: string | null
  activityNameEn: string | null
}

/** All of a member's entries (lifetime) with activity + week joined. */
export async function listMemberEntriesDetailed(
  memberId: string,
  client: Supabase = supabase,
): Promise<MemberStatEntry[]> {
  const { data, error } = await client
    .from('log_entry')
    .select(
      'activity_date, quantity, unit, final_points, week_id, activity_id, ' +
        'week!inner(start_date, week_number, round_id), activity(name_cs, name_en)',
    )
    .eq('member_id', memberId)

  if (error) throw error

  type Row = {
    activity_date: string
    quantity: number
    unit: string
    final_points: number
    week_id: string
    activity_id: string | null
    week: { start_date: string; week_number: number; round_id: string }
    activity: { name_cs: string; name_en: string } | null
  }

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    activityDate: r.activity_date,
    quantity: Number(r.quantity),
    unit: r.unit,
    finalPoints: Number(r.final_points),
    weekId: r.week_id,
    weekStartDate: r.week.start_date,
    weekNumber: r.week.week_number,
    roundId: r.week.round_id,
    activityId: r.activity_id,
    activityNameCs: r.activity?.name_cs ?? null,
    activityNameEn: r.activity?.name_en ?? null,
  }))
}

/**
 * Whether the member already logged an identical entry (same activity, quantity
 * and date). Used for the soft duplicate warning — the new entry is still
 * saved, but the UI flags it.
 */
export async function hasDuplicateEntry(
  memberId: string,
  activityId: string | null,
  activityDate: string,
  quantity: number,
  client: Supabase = supabase,
): Promise<boolean> {
  let query = client
    .from('log_entry')
    .select('id')
    .eq('member_id', memberId)
    .eq('activity_date', activityDate)
    .eq('quantity', quantity)

  // Quick-add entries have a null activity_id — match with `is`, not `eq`.
  query = activityId === null ? query.is('activity_id', null) : query.eq('activity_id', activityId)

  const { data, error } = await query.limit(1)

  if (error) throw error
  return (data ?? []).length > 0
}
