import type { RequestHandler } from 'express'
import { runWithTestMode } from '../testData/context'

/** Header the frontend sets when the "test data" toggle is on. */
export const TEST_DATA_HEADER = 'x-pes-test-data'

/**
 * Enable test-data mode for a request when it carries `X-PES-Test-Data: 1`.
 * Runs the rest of the handler chain inside the AsyncLocalStorage context so the
 * detailed log-entry readers can see the flag. When absent, this is a no-op and
 * the request serves real data. Read-only — it never changes what is written.
 */
export const testModeMiddleware: RequestHandler = (req, _res, next) => {
  const enabled = req.get(TEST_DATA_HEADER) === '1'
  if (!enabled) {
    next()
    return
  }
  runWithTestMode(true, () => next())
}
