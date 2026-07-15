import { Router } from 'express'
import { rotationPutSchema } from '../../schemas/admin'
import { getRotationOrder, saveRotation } from '../../services/adminRotation'
import { parseBody, sendResult } from './util'

export const adminRotationRouter = Router()

/** GET /api/admin/rotation — the ordered rotation with member display names. */
adminRotationRouter.get('/admin/rotation', async (_req, res, next) => {
  try {
    res.json(await getRotationOrder())
  } catch (err) {
    next(err)
  }
})

/** PUT /api/admin/rotation — persist the reordered list of member ids. */
adminRotationRouter.put('/admin/rotation', async (req, res, next) => {
  const body = parseBody(rotationPutSchema, req.body, res)
  if (!body) return
  try {
    sendResult(res, await saveRotation(body.memberIds))
  } catch (err) {
    next(err)
  }
})
