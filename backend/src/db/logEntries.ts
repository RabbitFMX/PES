import { supabase, type Supabase } from './supabaseClient'
import type { LogEntryRow, NewLogEntry } from './types'
import { listActiveActivities } from './activities'
import { listWeeks } from './weeks'
import { isTestMode } from '../testData/context'
import {
  generateActivityPoints,
  generateMemberDetailedEntries,
  type ActivityMeta,
} from '../testData/generator'

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

/** Fetch a single log entry by id (or null). Used by the self edit/delete path. */
export async function getLogEntryById(
  id: string,
  client: Supabase = supabase,
): Promise<LogEntryRow | null> {
  const { data, error } = await client.from('log_entry').select('*').eq('id', id).maybeSingle()

  if (error) throw error
  return (data as LogEntryRow | null) ?? null
}

/** Columns an owner may change when editing one of their entries. */
export type LogEntryUpdate = Partial<
  Pick<
    NewLogEntry,
    | 'activity_id'
    | 'activity_date'
    | 'quantity'
    | 'unit'
    | 'elevation_m'
    | 'with_stroller'
    | 'raw_points'
    | 'final_points'
    | 'source'
    | 'note'
  >
>

/** Update a log entry by id; returns the updated row (null if no such id). */
export async function updateLogEntry(
  id: string,
  patch: LogEntryUpdate,
  client: Supabase = supabase,
): Promise<LogEntryRow | null> {
  const { data, error } = await client
    .from('log_entry')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw error
  return (data as LogEntryRow | null) ?? null
}

/** Delete a log entry by id. */
export async function deleteLogEntry(id: string, client: Supabase = supabase): Promise<void> {
  const { error } = await client.from('log_entry').delete().eq('id', id)
  if (error) throw error
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

  // PostgREST caps a single response (default 1000 rows); with years of history
  // a round set easily exceeds that, so page through until a short page arrives.
  const PAGE = 1000
  const rows: { member_id: string; week_id: string; final_points: number }[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from('log_entry')
      .select('member_id, week_id, final_points')
      .in('week_id', weekIds)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)

    if (error) throw error
    const page = (data ?? []) as { member_id: string; week_id: string; final_points: number }[]
    rows.push(...page)
    if (page.length < PAGE) break
  }
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
  /** The real row id, or null for a synthesized test-data entry (not editable). */
  id: string | null
  activityDate: string
  quantity: number
  unit: string
  elevationM: number
  withStroller: boolean
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
      'id, activity_date, quantity, unit, elevation_m, with_stroller, final_points, week_id, activity_id, ' +
        'week!inner(start_date, week_number, round_id), activity(name_cs, name_en)',
    )
    .eq('member_id', memberId)

  if (error) throw error

  type Row = {
    id: string
    activity_date: string
    quantity: number
    unit: string
    elevation_m: number | null
    with_stroller: boolean
    final_points: number
    week_id: string
    activity_id: string | null
    week: { start_date: string; week_number: number; round_id: string }
    activity: { name_cs: string; name_en: string } | null
  }

  const rows = ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    activityDate: r.activity_date,
    quantity: Number(r.quantity),
    unit: r.unit,
    elevationM: Number(r.elevation_m ?? 0),
    withStroller: r.with_stroller ?? false,
    finalPoints: Number(r.final_points),
    weekId: r.week_id,
    weekStartDate: r.week.start_date,
    weekNumber: r.week.week_number,
    roundId: r.week.round_id,
    activityId: r.activity_id,
    activityNameCs: r.activity?.name_cs ?? null,
    activityNameEn: r.activity?.name_en ?? null,
  }))

  // Test-data mode: replace with generated detail that preserves each week's total.
  if (isTestMode()) {
    return generateMemberDetailedEntries(rows, await activityMetas(client))
  }
  return rows
}

/** Active activities mapped to the generator's ActivityMeta shape (test data). */
async function activityMetas(client: Supabase): Promise<ActivityMeta[]> {
  const activities = await listActiveActivities(client)
  return activities.map((a) => ({
    id: a.id,
    unit: a.unit,
    pointsPerUnit: Number(a.points_per_unit),
    nameCs: a.name_cs,
    nameEn: a.name_en,
    hasElevationBonus: a.has_elevation_bonus,
  }))
}

/**
 * Every DETAILED entry (activity_id present) across all members, with the
 * activity's names — for per-member "strongest activities" / signature titles.
 * Quick-add entries (null activity_id, e.g. the imported weekly totals) are
 * excluded by the inner join, so these stats fill only from real logged
 * activities going forward. Paginated (PostgREST caps at 1000).
 */
export async function listDetailedActivityPoints(client: Supabase = supabase): Promise<
  {
    member_id: string
    activity_id: string
    name_cs: string
    name_en: string
    final_points: number
  }[]
> {
  // Test-data mode: distribute each member's real lifetime total across a few
  // activities (sum preserved), so pack "strongest activities" fills in.
  if (isTestMode()) {
    const weeks = await listWeeks(client)
    const entries = await listRoundEntries(
      weeks.map((w) => w.id),
      client,
    )
    const totalByMember = new Map<string, number>()
    for (const e of entries) {
      totalByMember.set(e.member_id, (totalByMember.get(e.member_id) ?? 0) + e.final_points)
    }
    const metas = await activityMetas(client)
    return [...totalByMember.entries()].flatMap(([memberId, total]) =>
      generateActivityPoints(memberId, total, metas),
    )
  }

  const PAGE = 1000
  type Row = {
    member_id: string
    final_points: number
    activity_id: string
    activity: { name_cs: string; name_en: string } | null
  }
  const out: {
    member_id: string
    activity_id: string
    name_cs: string
    name_en: string
    final_points: number
  }[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from('log_entry')
      .select('member_id, final_points, activity_id, activity!inner(name_cs, name_en)')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data ?? []) as unknown as Row[]
    for (const r of rows) {
      out.push({
        member_id: r.member_id,
        activity_id: r.activity_id,
        name_cs: r.activity?.name_cs ?? '',
        name_en: r.activity?.name_en ?? '',
        final_points: Number(r.final_points),
      })
    }
    if (rows.length < PAGE) break
  }
  return out
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
