import { Router } from 'express'
import { getActiveActivities } from '../services/activities'

export const activitiesRouter = Router()

/**
 * GET /api/activities — the active rate table in the frontend `Activity` shape.
 * Any authenticated member may read it (the log-activity modal and admin
 * screens rely on it). Mounted behind `requireAuth` in app.ts.
 */
activitiesRouter.get('/activities', async (_req, res, next) => {
  try {
    res.json(await getActiveActivities())
  } catch (err) {
    next(err)
  }
})
