import { listActiveActivities } from '../db/activities'
import { supabase, type Supabase } from '../db/supabaseClient'
import { toActivity, type Activity } from '../schemas/activity'

/**
 * Business logic for the activities resource. Reads the active rate table via
 * the chunk-3 DB layer and maps each row to the camelCase `Activity` shape the
 * frontend expects. Routes stay thin and call this. The Supabase client is
 * injectable so it can be mocked in tests.
 */

/** The active rate table, ordered by Czech name, in the frontend `Activity` shape. */
export async function getActiveActivities(client: Supabase = supabase): Promise<Activity[]> {
  const rows = await listActiveActivities(client)
  return rows.map(toActivity)
}
