/**
 * Analytics integration seam. The real analytics script/SDK would be loaded here
 * — and ONLY here — so it can never run before the visitor has granted analytics
 * consent. `ConsentProvider` calls `initAnalytics` on consent and
 * `teardownAnalytics` on withdrawal; no other module touches analytics directly.
 *
 * It is a no-op placeholder today (there is no analytics vendor yet); wiring a
 * real one means filling in the two bodies below — the consent gate stays intact.
 */
let active = false

export function initAnalytics(): void {
  if (active) return
  active = true
  // TODO: inject the real analytics script / SDK here.
  if (import.meta.env.DEV) console.info('[analytics] initialised (consent granted)')
}

export function teardownAnalytics(): void {
  if (!active) return
  active = false
  // TODO: remove the analytics script / SDK and clear its cookies here.
  if (import.meta.env.DEV) console.info('[analytics] torn down (consent withdrawn)')
}

/** Whether analytics is currently loaded (used by tests to assert the gate). */
export function isAnalyticsActive(): boolean {
  return active
}
