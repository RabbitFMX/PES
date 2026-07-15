import { supabase, type Supabase } from './supabaseClient'
import type { ChallengeRow } from './types'

/**
 * Query helpers for the `challenge` and `challenge_submission` tables. Raw
 * Supabase queries live here, never in routes/services. The client is
 * injectable so it can be mocked in tests. (Full challenge CRUD is chunk 10;
 * the dashboard only needs to read this week's challenge + a submission flag.)
 */

/** This week's challenge (most recent for the week), or null if none is set. */
export async function getChallengeForWeek(
  weekId: string,
  client: Supabase = supabase,
): Promise<ChallengeRow | null> {
  const { data, error } = await client
    .from('challenge')
    .select('id, week_id, setter_member_id, title, description, deadline, status, created_at')
    .eq('week_id', weekId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  const rows = (data ?? []) as ChallengeRow[]
  return rows[0] ?? null
}

/** Whether the member has submitted to a challenge. */
export async function hasSubmittedToChallenge(
  challengeId: string,
  memberId: string,
  client: Supabase = supabase,
): Promise<boolean> {
  const { data, error } = await client
    .from('challenge_submission')
    .select('id')
    .eq('challenge_id', challengeId)
    .eq('member_id', memberId)
    .limit(1)

  if (error) throw error
  return (data ?? []).length > 0
}
