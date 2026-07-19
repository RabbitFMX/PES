import { Router } from 'express'
import type { AuthedRequest } from '../middleware/auth'
import { getLeaderboard, getRoundOptions } from '../services/leaderboard'

export const leaderboardRouter = Router()

/**
 * GET /api/leaderboard[?roundId=…] — standings for the selected round (default:
 * open, else most recent) split into pack A / B, each with a per-user
 * per-activity breakdown. Mounted behind `requireAuth` in app.ts.
 */
leaderboardRouter.get('/leaderboard', async (req, res, next) => {
  try {
    const { member } = req as AuthedRequest
    const roundId = typeof req.query.roundId === 'string' ? req.query.roundId : undefined
    res.json(await getLeaderboard(member, roundId))
  } catch (err) {
    next(err)
  }
})

/** GET /api/rounds — the rounds a member can browse (leaderboard filter). */
leaderboardRouter.get('/rounds', async (_req, res, next) => {
  try {
    res.json(await getRoundOptions())
  } catch (err) {
    next(err)
  }
})
