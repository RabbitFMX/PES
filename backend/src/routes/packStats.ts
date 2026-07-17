import { Router } from 'express'
import { getPackStats } from '../services/packStats'
import { getPackWeekly } from '../services/packWeekly'

/** GET /api/pack-stats — whole-pack comparison stats (Statistiky tab). */
export const packStatsRouter = Router()

packStatsRouter.get('/pack-stats', async (_req, res, next) => {
  try {
    res.json(await getPackStats())
  } catch (err) {
    next(err)
  }
})

/** GET /api/pack-weekly?roundId=… — per-week per-member points for one round. */
packStatsRouter.get('/pack-weekly', async (req, res, next) => {
  try {
    const roundId = typeof req.query.roundId === 'string' ? req.query.roundId : undefined
    res.json(await getPackWeekly(roundId))
  } catch (err) {
    next(err)
  }
})
