import { Router } from 'express'
import { challengeScoresSchema } from '../../schemas/challenge'
import { getCurrentChallengeForAdmin, setChallengeScores } from '../../services/adminChallenges'
import { parseBody, sendResult } from './util'

export const adminChallengesRouter = Router()

/** GET /api/admin/challenges/current — roster + current awards for scoring. */
adminChallengesRouter.get('/admin/challenges/current', async (_req, res, next) => {
  try {
    res.json(await getCurrentChallengeForAdmin())
  } catch (err) {
    next(err)
  }
})

/** PUT /api/admin/challenges/:id/scores — award/edit completion points. */
adminChallengesRouter.put('/admin/challenges/:id/scores', async (req, res, next) => {
  const body = parseBody(challengeScoresSchema, req.body, res)
  if (!body) return
  try {
    sendResult(res, await setChallengeScores(req.params.id, body))
  } catch (err) {
    next(err)
  }
})
