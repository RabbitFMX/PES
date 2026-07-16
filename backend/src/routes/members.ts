import { Router } from 'express'
import type { AuthedRequest } from '../middleware/auth'
import { getMemberOverview, listMembersDirectory } from '../services/memberOverview'

/**
 * View-others: the members directory and any member's personal overview
 * (read-only — mounted behind requireAuth, so any authenticated member may view
 * any other member, but editing stays self-only via PATCH /api/me).
 */
export const membersRouter = Router()

membersRouter.get('/members', async (_req, res, next) => {
  try {
    res.json(await listMembersDirectory())
  } catch (err) {
    next(err)
  }
})

membersRouter.get('/members/:id/overview', async (req, res, next) => {
  try {
    const lang = (req as AuthedRequest).member.language_pref
    res.json(await getMemberOverview(req.params.id, lang))
  } catch (err) {
    next(err)
  }
})
