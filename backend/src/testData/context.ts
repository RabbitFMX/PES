import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Request-scoped "test data" flag.
 *
 * When a request carries the test-data header (see middleware/testMode.ts) the
 * whole handler chain runs inside this AsyncLocalStorage context with
 * `enabled: true`. The two DETAILED log-entry readers in db/logEntries.ts check
 * `isTestMode()` and, when on, return DETERMINISTICALLY GENERATED per-activity
 * data that sums to the member's real weekly totals — so every stats/overview
 * screen fills with realistic detail without touching the database. Nothing is
 * persisted; flipping the flag off restores the real data on the next request.
 */
interface TestModeStore {
  enabled: boolean
}

const storage = new AsyncLocalStorage<TestModeStore>()

/** Run `fn` (and everything it awaits) with the test-data flag set. */
export function runWithTestMode<T>(enabled: boolean, fn: () => T): T {
  return storage.run({ enabled }, fn)
}

/** Whether the current request is in test-data mode (default false). */
export function isTestMode(): boolean {
  return storage.getStore()?.enabled === true
}
