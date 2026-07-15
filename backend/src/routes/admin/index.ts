import { Router } from 'express'
import { adminActivitiesRouter } from './activities'
import { adminMembersRouter } from './members'
import { adminRotationRouter } from './rotation'
import { adminRoundsRouter } from './rounds'

/**
 * The admin router bundles every `/api/admin/*` resource. It is mounted behind
 * `requireAdmin` in app.ts, so a member token on any admin route is rejected
 * (403) — the guard is applied once here rather than per sub-route.
 */
export const adminRouter = Router()

adminRouter.use(adminMembersRouter)
adminRouter.use(adminActivitiesRouter)
adminRouter.use(adminRoundsRouter)
adminRouter.use(adminRotationRouter)
