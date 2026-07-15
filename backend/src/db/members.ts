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
