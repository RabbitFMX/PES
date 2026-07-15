import { supabase, type Supabase } from './supabaseClient'
import type { ChallengeRow } from './types'

/**
 * Query helpers for the `challenge` and `challenge_submission` tables. Raw
 * Supabase queries live here, never in routes/services. The client is
 * injectable so it can be mocked in tests.
 */

const CHALLENGE_COLS =
  'id, week_id, setter_member_id, title, description, deadline, status, created_at, bonus_split'

/** This week's challenge (most recent for the week), or null if none is set. */
export async function getChallengeForWeek(
  weekId: string,
  client: Supabase = supabase,
): Promise<ChallengeRow | null> {
  const { data, error } = await client
    .from('challenge')
    .select(CHALLENGE_COLS)
    .eq('week_id', weekId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  const rows = (data ?? []) as ChallengeRow[]
  return rows[0] ?? null
}

/** A challenge by id, or null if there is no such challenge. */
export async function getChallengeById(
  id: string,
  client: Supabase = supabase,
): Promise<ChallengeRow | null> {
  const { data, error } = await client
    .from('challenge')
    .select(CHALLENGE_COLS)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return (data as ChallengeRow | null) ?? null
}

/** Total number of challenges ever created (drives the setter rotation index). */
export async function countChallenges(client: Supabase = supabase): Promise<number> {
  const { count, error } = await client
    .from('challenge')
    .select('id', { count: 'exact', head: true })

  if (error) throw error
  return count ?? 0
}

/** Columns supplied when creating a challenge (DB fills id/created_at/status). */
export interface NewChallenge {
  week_id: string
  setter_member_id: string
  title: string
  description: string | null
  deadline: string | null
  bonus_split: number[] | null
}

/** Insert a challenge and return the saved row. */
export async function insertChallenge(
  row: NewChallenge,
  client: Supabase = supabase,
): Promise<ChallengeRow> {
  const { data, error } = await client.from('challenge').insert(row).select(CHALLENGE_COLS).single()

  if (error) throw error
  return data as ChallengeRow
}

/** A submission plus the submitting member's display name. */
export interface SubmissionWithMember {
  memberId: string
  displayName: string
  value: number | null
}

/** All submissions for a challenge with the member's display name. */
export async function listSubmissions(
  challengeId: string,
  client: Supabase = supabase,
): Promise<SubmissionWithMember[]> {
  const { data, error } = await client
    .from('challenge_submission')
    .select('member_id, value, member!inner(name)')
    .eq('challenge_id', challengeId)

  if (error) throw error

  type Row = { member_id: string; value: number | null; member: { name: string } }
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    memberId: r.member_id,
    displayName: r.member.name,
    value: r.value === null ? null : Number(r.value),
  }))
}

/**
 * Upsert a member's value for a challenge (keep the latest value). The unique
 * (challenge_id, member_id) constraint guarantees one row — hence one bonus
 * award — per member per challenge.
 */
export async function upsertSubmission(
  challengeId: string,
  memberId: string,
  value: number,
  client: Supabase = supabase,
): Promise<void> {
  const { error } = await client
    .from('challenge_submission')
    .upsert(
      { challenge_id: challengeId, member_id: memberId, value },
      { onConflict: 'challenge_id,member_id' },
    )

  if (error) throw error
}

/** Persist recomputed rank + bonus for each member's submission. */
export async function setSubmissionScores(
  challengeId: string,
  scores: { memberId: string; rank: number | null; bonusPoints: number }[],
  client: Supabase = supabase,
): Promise<void> {
  for (const s of scores) {
    const { error } = await client
      .from('challenge_submission')
      .update({ rank: s.rank, bonus_points: s.bonusPoints })
      .eq('challenge_id', challengeId)
      .eq('member_id', s.memberId)
    if (error) throw error
  }
}

/** A closed challenge with its week number, for the past-results list. */
export interface ClosedChallenge {
  id: string
  title: string
  weekNumber: number
}

/** Recent finished (closed) challenges, most recent first. */
export async function listClosedChallenges(
  limit: number,
  client: Supabase = supabase,
): Promise<ClosedChallenge[]> {
  const { data, error } = await client
    .from('challenge')
    .select('id, title, week!inner(week_number), created_at')
    .eq('status', 'closed')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  type Row = { id: string; title: string; week: { week_number: number } }
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    title: r.title,
    weekNumber: r.week.week_number,
  }))
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
