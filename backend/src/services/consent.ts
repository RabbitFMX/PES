import { createHash } from 'node:crypto'
import { insertConsentLog } from '../db/consent'
import { updateMemberConsent } from '../db/members'
import type { MemberRow, NewConsentLog } from '../db/types'
import type { ConsentRequest } from '../schemas/consent'

/**
 * Consent business logic: hash the client IP, append the audit rows, and — for a
 * known member — update their current consent flags so the backend can gate
 * non-essential processing (marketing email, see services/notifications.ts).
 */

/**
 * Hash an IP with a server-side salt (SHA-256). Returns null for a missing IP.
 * We store ONLY the hash (GDPR data minimisation) — never the raw address — so
 * the log can still show "same visitor" correlation without holding PII.
 * Set `CONSENT_IP_SALT` in production so hashes are not guessable across deploys.
 */
export function hashIp(ip: string | undefined | null): string | null {
  if (!ip) return null
  const salt = process.env.CONSENT_IP_SALT ?? 'pes-dev-consent-salt'
  return createHash('sha256').update(`${ip}:${salt}`).digest('hex')
}

export interface RecordConsentContext {
  /** The authenticated member, or null for an anonymous (pre-login) decision. */
  memberId: string | null
  /** The client IP (Express `req.ip`); hashed before storage. */
  ip: string | undefined
  userAgent: string | undefined
}

/**
 * Persist a consent decision. Appends one immutable audit row per provided
 * category (so a withdrawal is recorded just like a grant) and, when the member
 * is known, updates their current consent flags.
 */
export async function recordConsent(req: ConsentRequest, ctx: RecordConsentContext): Promise<void> {
  const ipHash = hashIp(ctx.ip)

  const rows: NewConsentLog[] = []
  for (const type of ['analytics', 'marketing'] as const) {
    const granted = req.consents[type]
    if (granted === undefined) continue
    rows.push({
      member_id: ctx.memberId,
      ip_hash: ipHash,
      consent_type: type,
      granted,
      policy_version: req.policyVersion,
      policy_hash: req.policyHash,
      user_agent: ctx.userAgent ?? null,
    })
  }

  await insertConsentLog(rows)

  if (ctx.memberId) {
    const patch: { analytics_consent?: boolean; marketing_consent?: boolean } = {}
    if (req.consents.analytics !== undefined) patch.analytics_consent = req.consents.analytics
    if (req.consents.marketing !== undefined) patch.marketing_consent = req.consents.marketing
    if (Object.keys(patch).length > 0) await updateMemberConsent(ctx.memberId, patch)
  }
}

/**
 * Whether a member may be sent marketing / engagement email. Consent defaults to
 * false, so a member who never opted in (or has withdrawn) is excluded. This is
 * the single check every marketing email path must funnel through.
 */
export function mayReceiveMarketingEmail(member: MemberRow): boolean {
  return member.marketing_consent === true
}
