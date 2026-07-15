import { supabase, type Supabase } from './supabaseClient'
import type { MemberRoundDivisionRow, RoundRow } from './types'

/**
 * Query helpers for the `round` and `member_round_division` tables. Raw
 * Supabase queries live here, never in routes/services. The client is
 * injectable so it can be mocked in tests.
 */

/** The single open round, or null if none is open (e.g. between rounds). */
export async function getOpenRound(client: Supabase = supabase): Promise<RoundRow | null> {
  const { data, error } = await client
    .from('round')
    .select('id, name, start_date, end_date, status')
    .eq('status', 'open')
    .maybeSingle()

  if (error) throw error
  return (data as RoundRow | null) ?? null
}

/** All rounds, most recent first (by start date). */
export async function listRounds(client: Supabase = supabase): Promise<RoundRow[]> {
  const { data, error } = await client
    .from('round')
    .select('id, name, start_date, end_date, status')
    .order('start_date', { ascending: false })

  if (error) throw error
  return (data ?? []) as RoundRow[]
}

/** Every recorded member↔round division (across all rounds). */
export async function listAllMemberRoundDivisions(
  client: Supabase = supabase,
): Promise<MemberRoundDivisionRow[]> {
  const { data, error } = await client
    .from('member_round_division')
    .select('member_id, round_id, division')

  if (error) throw error
  return (data ?? []) as MemberRoundDivisionRow[]
}

/**
 * The recorded division per member for a given round (`member_round_division`).
 * Present for past rounds; usually empty for the current one, where standings
 * fall back to `member.division`.
 */
export async function getMemberRoundDivisions(
  roundId: string,
  client: Supabase = supabase,
): Promise<MemberRoundDivisionRow[]> {
  const { data, error } = await client
    .from('member_round_division')
    .select('member_id, round_id, division')
    .eq('round_id', roundId)

  if (error) throw error
  return (data ?? []) as MemberRoundDivisionRow[]
}
