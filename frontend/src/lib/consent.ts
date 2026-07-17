/**
 * GDPR consent — the per-client (per-browser) decision that gates non-essential
 * scripts, plus the policy identity we send to the backend audit log.
 *
 * Two consent categories are user-controllable (analytics, marketing); essential
 * cookies always run and need no consent. Nothing is pre-ticked: the default is
 * everything OFF until the visitor actively opts in.
 */

export type ConsentCategory = 'analytics' | 'marketing'

export interface ConsentState {
  analytics: boolean
  marketing: boolean
}

export interface StoredConsent extends ConsentState {
  version: string
  decidedAt: string
}

export const CONSENT_STORAGE_KEY = 'pes-consent'

/**
 * Bump when the consent/policy wording changes — a stored decision on an older
 * version is treated as "no decision", so the banner re-appears and fresh
 * consent is captured and logged.
 */
export const CONSENT_POLICY_VERSION = '2026-07-17'

/**
 * The canonical consent-policy text whose hash we log as proof of what was
 * agreed to. Keep this in step with the banner copy (i18n `consent.*`); the hash
 * changes if a single character does, so the audit trail records the exact
 * wording each member accepted.
 */
export const CONSENT_POLICY_TEXT =
  'PES uses only essential cookies by default. Analytics and marketing ' +
  'processing run only with your explicit consent, which you can change or ' +
  'withdraw at any time in Profile → Privacy. Consent version ' +
  CONSENT_POLICY_VERSION +
  '.'

/**
 * Small, dependency-free, stable string hash (FNV-1a, 32-bit, hex). Enough to
 * fingerprint the policy text for the audit log; it is NOT a security primitive.
 */
export function fnv1a(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export const CONSENT_POLICY_HASH = fnv1a(CONSENT_POLICY_TEXT)

/** Consent with everything non-essential OFF — the pre-decision default. */
export const NO_CONSENT: ConsentState = { analytics: false, marketing: false }

/** Read this browser's stored decision, or null if none / a stale policy version. */
export function loadConsent(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredConsent>
    if (
      parsed.version !== CONSENT_POLICY_VERSION ||
      typeof parsed.analytics !== 'boolean' ||
      typeof parsed.marketing !== 'boolean'
    ) {
      return null
    }
    return {
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      version: parsed.version,
      decidedAt: typeof parsed.decidedAt === 'string' ? parsed.decidedAt : '',
    }
  } catch {
    return null
  }
}

/** Persist this browser's decision, stamped with the current policy version. */
export function saveConsent(state: ConsentState): StoredConsent {
  const stored: StoredConsent = {
    ...state,
    version: CONSENT_POLICY_VERSION,
    decidedAt: new Date().toISOString(),
  }
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Ignore storage failures (e.g. private mode) — consent still applies this session.
  }
  return stored
}
