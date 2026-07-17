import { supabase, type Supabase } from './supabaseClient'
import type { NewConsentLog } from './types'

/**
 * Query helpers for the `consent_log` table — the immutable GDPR consent audit
 * trail. Rows are only ever appended (never updated or deleted), so this exposes
 * a single insert helper.
 */

/** Append consent-decision rows to the audit log (no-op for an empty list). */
export async function insertConsentLog(
  rows: NewConsentLog[],
  client: Supabase = supabase,
): Promise<void> {
  if (rows.length === 0) return
  const { error } = await client.from('consent_log').insert(rows)
  if (error) throw error
}
