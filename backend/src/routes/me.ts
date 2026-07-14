import { Router } from 'express'
import type { AuthedRequest } from '../middleware/auth'
import { toCurrentUser } from '../schemas/currentUser'

export const meRouter = Router()

/** GET /api/me — the authenticated member as the frontend CurrentUser shape. */
meRouter.get('/me', (req, res) => {
  const { member } = req as AuthedRequest
  res.json(toCurrentUser(member))
})
