/**
 * "Test data" toggle (a testing aid). When ON, the API client sends the
 * `X-PES-Test-Data` header on every request; the backend then serves DETAILED
 * stats generated from the real weekly totals (the totals themselves stay
 * unchanged), so all the stats/overview charts can be exercised with rich data.
 * The choice is per-browser (localStorage) and read fresh on each request, so no
 * React wiring is needed — flipping it and reloading is enough.
 */

export const TEST_DATA_STORAGE_KEY = 'pes-test-data'

/** Header the backend reads to enable generated detailed data for a request. */
export const TEST_DATA_HEADER = 'X-PES-Test-Data'

/** Whether test-data mode is enabled on this browser. */
export function isTestDataEnabled(): boolean {
  try {
    return localStorage.getItem(TEST_DATA_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** Enable/disable test-data mode on this browser. */
export function setTestDataEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(TEST_DATA_STORAGE_KEY, '1')
    else localStorage.removeItem(TEST_DATA_STORAGE_KEY)
  } catch {
    // Ignore storage failures (private mode) — the toggle just won't persist.
  }
}
