import { supabase, type Supabase } from './supabaseClient'
import type { ActivityRow } from './types'

/**
 * Query helpers for the `activity` rate table. Raw Supabase queries live here,
 * never in routes/services — later chunks (Activities API, Log activity, Admin
 * rate-table editor) reuse these. The client is injectable so it can be mocked
 * in tests.
 */

/** Active activities, ordered by Czech name — the rate table the Log UI shows. */
export async function listActiveActivities(client: Supabase = supabase): Promise<ActivityRow[]> {
  const { data, error } = await client
    .from('activity')
    .select('*')
    .eq('active', true)
    .order('name_cs', { ascending: true })

  if (error) throw error
  return (data ?? []) as ActivityRow[]
}

/** A single activity by id, or null if it does not exist. */
export async function getActivity(
  id: string,
  client: Supabase = supabase,
): Promise<ActivityRow | null> {
  const { data, error } = await client.from('activity').select('*').eq('id', id).maybeSingle()

  if (error) throw error
  return (data as ActivityRow | null) ?? null
}

/** Every activity, including inactive — the admin rate-table editor. */
export async function listAllActivities(client: Supabase = supabase): Promise<ActivityRow[]> {
  const { data, error } = await client
    .from('activity')
    .select('*')
    .order('name_cs', { ascending: true })

  if (error) throw error
  return (data ?? []) as ActivityRow[]
}

/** Insert a new activity row and return it. */
export async function insertActivity(
  row: ActivityRow,
  client: Supabase = supabase,
): Promise<ActivityRow> {
  const { data, error } = await client.from('activity').insert(row).select('*').single()

  if (error) throw error
  return data as ActivityRow
}

/** How many log entries reference this activity (blocks a hard delete when > 0). */
export async function countActivityLogEntries(
  id: string,
  client: Supabase = supabase,
): Promise<number> {
  const { count, error } = await client
    .from('log_entry')
    .select('id', { count: 'exact', head: true })
    .eq('activity_id', id)

  if (error) throw error
  return count ?? 0
}

/** Hard-delete an activity row by id. FK-safe only when it has no log entries. */
export async function deleteActivity(id: string, client: Supabase = supabase): Promise<void> {
  const { error } = await client.from('activity').delete().eq('id', id)
  if (error) throw error
}

/** Update an activity by id; returns the updated row (null if no such id). */
export async function updateActivity(
  id: string,
  patch: Partial<Omit<ActivityRow, 'id'>>,
  client: Supabase = supabase,
): Promise<ActivityRow | null> {
  const { data, error } = await client
    .from('activity')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw error
  return (data as ActivityRow | null) ?? null
}
