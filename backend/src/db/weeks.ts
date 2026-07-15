import { supabase, type Supabase } from './supabaseClient'
import type { WeekRow } from './types'

/**
 * Query helpers for the `week` table. Raw Supabase queries live here, never in
 * routes/services. The client is injectable so it can be mocked in tests.
 */

/**
 * The current open week: the week whose date range contains `onDate` and whose
 * round is `open`. Returns null if no open week covers the date (e.g. between
 * rounds). `onDate` is an ISO `YYYY-MM-DD` string.
 */
export async function getCurrentWeek(
  onDate: string,
  client: Supabase = supabase,
): Promise<WeekRow | null> {
  const { data, error } = await client
    .from('week')
    .select('id, round_id, week_number, start_date, end_date, round!inner(status)')
    .eq('round.status', 'open')
    .lte('start_date', onDate)
    .gte('end_date', onDate)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  // Strip the embedded round join; callers only need the week columns.
  const { round: _round, ...week } = data as WeekRow & { round: unknown }
  return week as WeekRow
}

/** Every week across all rounds, ordered by `start_date` ascending. */
export async function listWeeks(client: Supabase = supabase): Promise<WeekRow[]> {
  const { data, error } = await client
    .from('week')
    .select('id, round_id, week_number, start_date, end_date')
    .order('start_date', { ascending: true })

  if (error) throw error
  return (data ?? []) as WeekRow[]
}

/** All weeks of a round, ordered by `week_number` ascending. */
export async function listWeeksByRound(
  roundId: string,
  client: Supabase = supabase,
): Promise<WeekRow[]> {
  const { data, error } = await client
    .from('week')
    .select('id, round_id, week_number, start_date, end_date')
    .eq('round_id', roundId)
    .order('week_number', { ascending: true })

  if (error) throw error
  return (data ?? []) as WeekRow[]
}
