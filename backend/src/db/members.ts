import { supabase, type Supabase } from './supabaseClient'
import type { MemberRow } from './types'

/**
 * Query helpers for the `member` table. member.id is the Supabase auth.users
 * UUID, so an authenticated request resolves to a member row by that id.
 */

/** A member by id (the auth.users UUID), or null if there is no such member. */
export async function getMemberById(
  id: string,
  client: Supabase = supabase,
): Promise<MemberRow | null> {
  const { data, error } = await client.from('member').select('*').eq('id', id).maybeSingle()

  if (error) throw error
  return (data as MemberRow | null) ?? null
}

/** All active members (used for round standings). */
export async function listActiveMembers(client: Supabase = supabase): Promise<MemberRow[]> {
  const { data, error } = await client.from('member').select('*').eq('status', 'active')

  if (error) throw error
  return (data ?? []) as MemberRow[]
}

/** Every member, including those who have `left` (admin roster). */
export async function listAllMembers(client: Supabase = supabase): Promise<MemberRow[]> {
  const { data, error } = await client.from('member').select('*').order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as MemberRow[]
}

/** A member by email, or null — used to reject duplicate invites. */
export async function getMemberByEmail(
  email: string,
  client: Supabase = supabase,
): Promise<MemberRow | null> {
  const { data, error } = await client.from('member').select('*').eq('email', email).maybeSingle()

  if (error) throw error
  return (data as MemberRow | null) ?? null
}

/**
 * Send a Supabase Auth invite for an email and return the created auth user id
 * (which becomes `member.id`). Uses the service-role admin API — invite-only
 * onboarding, §11. Kept here so the service/routes stay Supabase-agnostic and
 * tests can mock it.
 */
export async function inviteAuthUser(
  email: string,
  client: Supabase = supabase,
): Promise<{ userId: string }> {
  const { data, error } = await client.auth.admin.inviteUserByEmail(email)
  if (error) throw error
  if (!data.user) throw new Error('invite did not return a user')
  return { userId: data.user.id }
}

/**
 * Create a Supabase Auth user WITH a password (email pre-confirmed) and return
 * the new auth user id (which becomes `member.id`). Used by public self-signup
 * (services/signup.ts) — distinct from `inviteAuthUser`, which sends an admin
 * invite email and sets no password.
 */
export async function signUpAuthUser(
  email: string,
  password: string,
  client: Supabase = supabase,
): Promise<{ userId: string }> {
  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw error
  if (!data.user) throw new Error('signup did not return a user')
  return { userId: data.user.id }
}

/** Insert a member row (the id is the Supabase auth.users id from the invite). */
export async function insertMember(
  row: MemberRow,
  client: Supabase = supabase,
): Promise<MemberRow> {
  const { data, error } = await client.from('member').insert(row).select('*').single()

  if (error) throw error
  return data as MemberRow
}

/** Fields an admin may edit on a member. */
export interface MemberUpdate {
  division?: 'A' | 'B'
  coefficient?: number
  role?: 'member' | 'admin'
  status?: 'active' | 'left'
  injury_exempt_until?: string | null
}

/** Update editable member fields; returns the updated row (null if no such id). */
export async function updateMember(
  id: string,
  patch: MemberUpdate,
  client: Supabase = supabase,
): Promise<MemberRow | null> {
  const { data, error } = await client
    .from('member')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw error
  return (data as MemberRow | null) ?? null
}

/**
 * Move every child record owned by `fromId` to `toId` (the claim/merge tool).
 * Composite-PK tables (division/bank) and the unique challenge_submission first
 * drop `from` rows that would collide with existing `to` rows, then reassign the
 * rest — so merging a historical member into a fresh account is conflict-free.
 */
export async function reassignMemberChildRecords(
  fromId: string,
  toId: string,
  client: Supabase = supabase,
): Promise<void> {
  const throwOn = (error: unknown) => {
    if (error) throw error
  }

  for (const table of ['member_round_division', 'member_round_bank'] as const) {
    const existing = await client.from(table).select('round_id').eq('member_id', toId)
    throwOn(existing.error)
    const roundIds = (existing.data ?? []).map((r) => (r as { round_id: string }).round_id)
    if (roundIds.length) {
      throwOn(
        (await client.from(table).delete().eq('member_id', fromId).in('round_id', roundIds)).error,
      )
    }
    throwOn((await client.from(table).update({ member_id: toId }).eq('member_id', fromId)).error)
  }

  const subs = await client
    .from('challenge_submission')
    .select('challenge_id')
    .eq('member_id', toId)
  throwOn(subs.error)
  const chIds = (subs.data ?? []).map((r) => (r as { challenge_id: string }).challenge_id)
  if (chIds.length) {
    throwOn(
      (
        await client
          .from('challenge_submission')
          .delete()
          .eq('member_id', fromId)
          .in('challenge_id', chIds)
      ).error,
    )
  }
  throwOn(
    (await client.from('challenge_submission').update({ member_id: toId }).eq('member_id', fromId))
      .error,
  )

  throwOn(
    (await client.from('log_entry').update({ member_id: toId }).eq('member_id', fromId)).error,
  )
  throwOn(
    (
      await client
        .from('challenge')
        .update({ setter_member_id: toId })
        .eq('setter_member_id', fromId)
    ).error,
  )
}

/** Delete a member row (used after merging a historical member into a real account). */
export async function deleteMember(id: string, client: Supabase = supabase): Promise<void> {
  const { error } = await client.from('member').delete().eq('id', id)
  if (error) throw error
}

/** Fields a member may change on their OWN profile (PATCH /api/me). */
export interface MemberProfileUpdate {
  name?: string
  avatar_url?: string | null
  language_pref?: 'cs' | 'en'
  theme_pref?: 'light' | 'dark'
}

/** Update the member's own profile fields; returns the updated row (null if no such id). */
export async function updateMemberProfile(
  id: string,
  patch: MemberProfileUpdate,
  client: Supabase = supabase,
): Promise<MemberRow | null> {
  const { data, error } = await client
    .from('member')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw error
  return (data as MemberRow | null) ?? null
}

/** Current GDPR consent flags a member may grant/withdraw for themselves. */
export interface MemberConsentUpdate {
  analytics_consent?: boolean
  marketing_consent?: boolean
}

/**
 * Update a member's current consent flags. The immutable audit trail lives in
 * `consent_log` (db/consent.ts); this only reflects the LATEST state so the
 * backend can gate non-essential processing (e.g. marketing email) cheaply.
 */
export async function updateMemberConsent(
  id: string,
  patch: MemberConsentUpdate,
  client: Supabase = supabase,
): Promise<void> {
  const { error } = await client.from('member').update(patch).eq('id', id)
  if (error) throw error
}
