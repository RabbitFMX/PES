import { Router } from 'express'
import type { AuthedRequest } from '../middleware/auth'
import { logInputSchema } from '../schemas/logEntry'
import { commitLogEntry, previewLogEntry } from '../services/logEntries'

export const logEntriesRouter = Router()

/**
 * POST /api/log-entries/preview — compute points for a detailed or quick-add
 * entry and return the confirm-before-save preview. No DB write.
 */
logEntriesRouter.post('/log-entries/preview', async (req, res, next) => {
  try {
    const input = logInputSchema.parse(req.body)
    const { member } = req as AuthedRequest
    res.json(await previewLogEntry(input, member))
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/log-entries — recompute server-side and persist the entry. Returns
 * the saved row(s), the member's new weekly total, and a soft duplicate flag.
 */
logEntriesRouter.post('/log-entries', async (req, res, next) => {
  try {
    const input = logInputSchema.parse(req.body)
    const { member } = req as AuthedRequest
    res.status(201).json(await commitLogEntry(input, member))
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/log-entries/parse — natural-language → structured preview.
 * Deferred: the LLM path is not built yet, so this returns 501 with a manual
 * -fallback hint. Every AI path must keep a working manual path (repo rule 8).
 */
logEntriesRouter.post('/log-entries/parse', (_req, res) => {
  // TODO: LLM API (seminar 6) — natural-language parsing
  res.status(501).json({
    error: 'not_implemented',
    message:
      'Natural-language parsing is not implemented yet (seminar 6). Use detailed or quick-add.',
  })
})
