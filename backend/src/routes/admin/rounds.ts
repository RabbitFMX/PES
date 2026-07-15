import { Router } from 'express'
import { roundCreateSchema, roundPatchSchema } from '../../schemas/admin'
import { createRound, editRound, getRounds } from '../../services/adminRounds'
import { parseBody, sendResult } from './util'

export const adminRoundsRouter = Router()

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
