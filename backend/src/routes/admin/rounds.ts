import { Router } from 'express'
import { roundCreateSchema, roundPatchSchema } from '../../schemas/admin'
import { createRound, editRound, getRounds } from '../../services/adminRounds'
import { buildRoundExport } from '../../services/roundExport'
import { parseBody, sendResult } from './util'

export const adminRoundsRouter = Router()

/**
 * GET /api/admin/rounds/:id/export — download the round as an .xlsx sheet in the
 * legacy PES 2.0.xlsx round-sheet layout (so it continues the original table).
 */
adminRoundsRouter.get('/admin/rounds/:id/export', async (req, res, next) => {
  try {
    const { filename, buffer } = await buildRoundExport(req.params.id)
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    )
    res.send(buffer)
  } catch (err) {
    next(err)
  }
})

/** GET /api/admin/rounds — all rounds, most recent first. */
adminRoundsRouter.get('/admin/rounds', async (_req, res, next) => {
  try {
    res.json(await getRounds())
  } catch (err) {
    next(err)
  }
})

/** POST /api/admin/rounds — create the next (upcoming) round. */
adminRoundsRouter.post('/admin/rounds', async (req, res, next) => {
  const body = parseBody(roundCreateSchema, req.body, res)
  if (!body) return
  try {
    sendResult(res, await createRound(body), 201)
  } catch (err) {
    next(err)
  }
})

/** PATCH /api/admin/rounds/:id — edit fields; status opens/closes the round. */
adminRoundsRouter.patch('/admin/rounds/:id', async (req, res, next) => {
  const body = parseBody(roundPatchSchema, req.body, res)
  if (!body) return
  try {
    sendResult(res, await editRound(req.params.id, body))
  } catch (err) {
    next(err)
  }
})
