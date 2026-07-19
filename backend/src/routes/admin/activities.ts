import { Router } from 'express'
import { activityCreateSchema, activityPatchSchema } from '../../schemas/admin'
import {
  createActivity,
  deleteActivity,
  editActivity,
  getActivities,
} from '../../services/adminActivities'
import { parseBody, sendResult } from './util'

export const adminActivitiesRouter = Router()

/** GET /api/admin/activities — every activity, including inactive, full fields. */
adminActivitiesRouter.get('/admin/activities', async (_req, res, next) => {
  try {
    res.json(await getActivities())
  } catch (err) {
    next(err)
  }
})

/** POST /api/admin/activities — create a rate-table row. */
adminActivitiesRouter.post('/admin/activities', async (req, res, next) => {
  const body = parseBody(activityCreateSchema, req.body, res)
  if (!body) return
  try {
    sendResult(res, await createActivity(body), 201)
  } catch (err) {
    next(err)
  }
})

/** PATCH /api/admin/activities/:id — edit rates/flags/active. */
adminActivitiesRouter.patch('/admin/activities/:id', async (req, res, next) => {
  const body = parseBody(activityPatchSchema, req.body, res)
  if (!body) return
  try {
    sendResult(res, await editActivity(req.params.id, body))
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/admin/activities/:id — hard-delete a rate-table row. Refused
 * (`in_use`) for activities that already have log entries; deactivate instead.
 */
adminActivitiesRouter.delete('/admin/activities/:id', async (req, res, next) => {
  try {
    sendResult(res, await deleteActivity(req.params.id))
  } catch (err) {
    next(err)
  }
})
