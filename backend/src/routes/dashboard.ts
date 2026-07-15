import { Router } from 'express'
import type { AuthedRequest } from '../middleware/auth'
import { getDashboard } from '../services/dashboard'

export const dashboardRouter = Router()

/**
 * GET /api/dashboard — the authenticated member's current-week summary in the
 * frontend `DashboardData` shape. Mounted behind `requireAuth` in app.ts.
 */
dashboardRouter.get('/dashboard', async (req, res, next) => {
  try {
    const { member } = req as AuthedRequest
    res.json(await getDashboard(member))
  } catch (err) {
    next(err)
  }
})
