import type { MemberRow } from '../db/types'
import { mayReceiveMarketingEmail } from './consent'

/**
 * Recipient selection for outbound email. This is where consent gates email
 * SENDING: the weekly-nudge workflow (project-brief §20, run from n8n) must
 * build its recipient list through here, so a member who withdraws marketing
 * consent in Profile → Privacy stops receiving nudges immediately.
 *
 * Only active members who have given marketing consent are returned. Essential
 * transactional mail (password reset, invites — handled by Supabase Auth) is a
 * separate, non-marketing path and is NOT gated here.
 */
export function weeklyNudgeRecipients(members: MemberRow[]): MemberRow[] {
  return members.filter((m) => m.status === 'active' && mayReceiveMarketingEmail(m))
}
