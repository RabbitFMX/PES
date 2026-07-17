import { createContext, useContext } from 'react'
import type { ConsentCategory, ConsentState } from '../lib/consent'

export interface ConsentContextValue {
  /** The current per-client decision (all-false before any choice is made). */
  consent: ConsentState
  /** True until the visitor makes a choice on this browser — the banner shows. */
  needsDecision: boolean
  /** Record/replace the whole decision (banner accept / reject / save). */
  setConsent: (next: ConsentState) => void
  /** Change a single category (profile Privacy toggles). */
  updateCategory: (category: ConsentCategory, granted: boolean) => void
}

export const ConsentContext = createContext<ConsentContextValue | null>(null)

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext)
  if (!ctx) throw new Error('useConsent must be used within ConsentProvider')
  return ctx
}
