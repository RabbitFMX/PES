import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CONSENT_POLICY_HASH,
  CONSENT_POLICY_VERSION,
  loadConsent,
  NO_CONSENT,
  saveConsent,
  type ConsentCategory,
  type ConsentState,
} from '../lib/consent'
import { initAnalytics, teardownAnalytics } from '../lib/analytics'
import { initMarketing, teardownMarketing } from '../lib/marketing'
import { recordConsent } from '../lib/api'
import { ConsentContext } from './consent'

/**
 * Apply a consent decision to the non-essential integrations. This is the ONLY
 * place analytics/marketing are switched on, so nothing loads without consent
 * and withdrawing consent tears the integration down immediately.
 */
function applyConsent(state: ConsentState): void {
  if (state.analytics) initAnalytics()
  else teardownAnalytics()
  if (state.marketing) initMarketing()
  else teardownMarketing()
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  // Read this browser's stored decision (lazy, so it runs once before first
  // paint). Keep only the consent fields — drop the stored version/timestamp —
  // so state stays a clean ConsentState.
  const [consent, setConsentState] = useState<ConsentState>(() => {
    const s = loadConsent()
    return s ? { analytics: s.analytics, marketing: s.marketing } : NO_CONSENT
  })
  const [needsDecision, setNeedsDecision] = useState(() => loadConsent() === null)

  // Honour whatever was already stored (returning visitor) on first mount.
  useEffect(() => {
    applyConsent(consent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persist = useCallback((next: ConsentState) => {
    setConsentState(next)
    setNeedsDecision(false)
    saveConsent(next)
    applyConsent(next)
    // Best-effort server audit log — never block the UI or throw on failure.
    // Sent with the Supabase token if signed in (links the row + account),
    // anonymously otherwise.
    void recordConsent({
      consents: next,
      policyVersion: CONSENT_POLICY_VERSION,
      policyHash: CONSENT_POLICY_HASH,
    }).catch(() => {})
  }, [])

  const updateCategory = useCallback(
    (category: ConsentCategory, granted: boolean) => {
      persist({ ...consent, [category]: granted })
    },
    [persist, consent],
  )

  const value = useMemo(
    () => ({ consent, needsDecision, setConsent: persist, updateCategory }),
    [consent, needsDecision, persist, updateCategory],
  )

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
}
