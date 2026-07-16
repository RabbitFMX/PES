import { Router } from 'express'
import type { AuthedRequest } from '../middleware/auth'
import { HttpError } from '../middleware/errorHandler'
import { updateMemberProfile, type MemberProfileUpdate } from '../db/members'
import { meProfilePatchSchema, toCurrentUser } from '../schemas/currentUser'

export const meRouter = Router()

/** GET /api/me — the authenticated member as the frontend CurrentUser shape. */
meRouter.get('/me', (req, res) => {
  const { member } = req as AuthedRequest
  res.json(toCurrentUser(member))
})

/** PATCH /api/me — the member updates their OWN profile (name, avatar, prefs). */
meRouter.patch('/me', async (req, res, next) => {
  try {
    const patch = meProfilePatchSchema.parse(req.body)
    const dbPatch: MemberProfileUpdate = {}
    if (patch.displayName !== undefined) dbPatch.name = patch.displayName
    if (patch.avatarUrl !== undefined) dbPatch.avatar_url = patch.avatarUrl
    if (patch.languagePref !== undefined) dbPatch.language_pref = patch.languagePref
    if (patch.themePref !== undefined) dbPatch.theme_pref = patch.themePref

    const updated = await updateMemberProfile((req as AuthedRequest).member.id, dbPatch)
    if (!updated) throw new HttpError(404, 'not_found')
    res.json(toCurrentUser(updated))
  } catch (err) {
    next(err)
  }
})
