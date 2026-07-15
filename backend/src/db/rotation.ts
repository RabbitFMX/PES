import { supabase, type Supabase } from './supabaseClient'

/**
 * Query helpers for the `challenge_rotation` table (the admin-defined order for
 * who sets the next weekly challenge). Chunk 10 reads it to work out whose turn
 * it is; chunk 11 adds the admin write (PUT /api/admin/rotation).
 */

export interface RotationEntry {
  memberId: string
  orderPosition: number
}

/** The rotation order, ascending by position. */
export async function getRotation(client: Supabase = supabase): Promise<RotationEntry[]> {
  const { data, error } = await client
    .from('challenge_rotation')
    .select('member_id, order_position')
    .order('order_position', { ascending: true })

  if (error) throw error

  type Row = { member_id: string; order_position: number }
  return ((data ?? []) as Row[]).map((r) => ({
    memberId: r.member_id,
    orderPosition: r.order_position,
  }))
}

/**
 * Replace the whole rotation with the given member ids, in order (0-based
 * positions). Runs atomically via the `set_challenge_rotation` SQL function
 * (chunk 11 migration) so there is never a partial write.
 */
export async function putRotation(memberIds: string[], client: Supabase = supabase): Promise<void> {
  const { error } = await client.rpc('set_challenge_rotation', { p_member_ids: memberIds })
  if (error) throw error
}
