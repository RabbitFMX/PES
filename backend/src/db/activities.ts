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
