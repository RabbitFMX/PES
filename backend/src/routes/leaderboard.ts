import { Router } from 'express'
import type { AuthedRequest } from '../middleware/auth'
import { getLeaderboard } from '../services/leaderboard'

export const leaderboardRouter = Router()

/**
 * GET /api/leaderboard — current-round standings split into pack A / B in the
 * frontend `LeaderboardData` shape. Mounted behind `requireAuth` in app.ts.
 */
leaderboardRouter.get('/leaderboard', async (req, res, next) => {
  try {
    const { member } = req as AuthedRequest
    res.json(await getLeaderboard(member))
  } catch (err) {
    next(err)
  }
})
