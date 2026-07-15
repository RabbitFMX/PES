import { Router } from 'express'
import type { AuthedRequest } from '../middleware/auth'
import { challengeCreateSchema, submissionCreateSchema } from '../schemas/challenge'
import {
  createChallenge,
  getCurrentChallenge,
  getPastChallenges,
  submitToChallenge,
} from '../services/challenges'

export const challengesRouter = Router()

/** GET /api/challenges/current — this week's challenge + ranked submissions. */
challengesRouter.get('/challenges/current', async (req, res, next) => {
  try {
    const { member } = req as AuthedRequest
    res.json(await getCurrentChallenge(member))
  } catch (err) {
    next(err)
  }
})

/** GET /api/challenges/past — recent finished challenges with their winner. */
challengesRouter.get('/challenges/past', async (_req, res, next) => {
  try {
    res.json(await getPastChallenges())
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/challenges — create this week's challenge. Setter-only: the service
 * rejects a non-setter with 403 (the "setter" is decided by the rotation, not a
 * role, so the check lives in the service, not a route guard).
 */
challengesRouter.post('/challenges', async (req, res, next) => {
  try {
    const input = challengeCreateSchema.parse(req.body)
    const { member } = req as AuthedRequest
    await createChallenge(member, input)
    res.status(201).json({ ok: true })
  } catch (err) {
    next(err)
  }
})

/** POST /api/challenges/:id/submissions — upsert the member's value. */
challengesRouter.post('/challenges/:id/submissions', async (req, res, next) => {
  try {
    const { value } = submissionCreateSchema.parse(req.body)
    const { member } = req as AuthedRequest
    await submitToChallenge(member, req.params.id, value)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
