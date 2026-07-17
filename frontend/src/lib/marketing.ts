/**
 * Marketing integration seam. Any marketing/retargeting pixel or SDK would be
 * loaded here — and ONLY here — so it can never run before the visitor has
 * granted marketing consent. `ConsentProvider` calls `initMarketing` on consent
 * and `teardownMarketing` on withdrawal.
 *
 * It is a no-op placeholder today; wiring a real vendor means filling in the two
 * bodies below — the consent gate stays intact.
 */
let active = false

export function initMarketing(): void {
  if (active) return
  active = true
  // TODO: inject the real marketing pixel / SDK here.
  if (import.meta.env.DEV) console.info('[marketing] initialised (consent granted)')
}

export function teardownMarketing(): void {
  if (!active) return
  active = false
  // TODO: remove the marketing pixel / SDK and clear its cookies here.
  if (import.meta.env.DEV) console.info('[marketing] torn down (consent withdrawn)')
}

/** Whether marketing is currently loaded (used by tests to assert the gate). */
export function isMarketingActive(): boolean {
  return active
}
