import { Router } from 'express'
import type { AuthedRequest } from '../middleware/auth'
import { statsQuerySchema } from '../schemas/stats'
import { getStats } from '../services/stats'

export const statsRouter = Router()

/**
 * GET /api/stats?roundId=<id> — the authenticated member's long-term stats in
 * the frontend `StatsData` shape. `roundId` is optional (defaults to the open
 * round) and scopes the points-over-time line. Mounted behind `requireAuth`.
 */
statsRouter.get('/stats', async (req, res, next) => {
  try {
    const { roundId } = statsQuerySchema.parse(req.query)
    const { member } = req as AuthedRequest
    res.json(await getStats(member, roundId))
  } catch (err) {
    next(err)
  }
})
