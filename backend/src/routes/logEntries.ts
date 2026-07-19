import { Router } from 'express'
import type { AuthedRequest } from '../middleware/auth'
import { logInputSchema } from '../schemas/logEntry'
import {
  commitLogEntry,
  editLogEntry,
  getOwnLogEntry,
  previewLogEntry,
  removeLogEntry,
} from '../services/logEntries'

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
 * GET /api/log-entries/:id — the owner loads one of their entries to prefill
 * the edit form. 404 for missing or not-owned.
 */
logEntriesRouter.get('/log-entries/:id', async (req, res, next) => {
  try {
    const { member } = req as AuthedRequest
    res.json(await getOwnLogEntry(req.params.id, member))
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/log-entries/:id — the owner edits one of their current-week
 * entries (points recomputed server-side). Ownership + current-week enforced.
 */
logEntriesRouter.patch('/log-entries/:id', async (req, res, next) => {
  try {
    const input = logInputSchema.parse(req.body)
    const { member } = req as AuthedRequest
    res.json(await editLogEntry(req.params.id, input, member))
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/log-entries/:id — the owner deletes one of their current-week
 * entries. Returns the member's new weekly total.
 */
logEntriesRouter.delete('/log-entries/:id', async (req, res, next) => {
  try {
    const { member } = req as AuthedRequest
    res.json(await removeLogEntry(req.params.id, member))
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
