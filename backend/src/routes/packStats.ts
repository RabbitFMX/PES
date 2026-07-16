import { Router } from 'express'
import { getPackStats } from '../services/packStats'

/** GET /api/pack-stats — whole-pack comparison stats (Statistiky tab). */
export const packStatsRouter = Router()

packStatsRouter.get('/pack-stats', async (_req, res, next) => {
  try {
    res.json(await getPackStats())
  } catch (err) {
    next(err)
  }
})
