import { Router } from 'express'
import { memberInviteSchema, memberMergeSchema, memberPatchSchema } from '../../schemas/admin'
import { editMember, getMembers, inviteMember, mergeMembers } from '../../services/adminMembers'
import { parseBody, sendResult } from './util'

export const adminMembersRouter = Router()

/** GET /api/admin/members — every member, including those who left. */
adminMembersRouter.get('/admin/members', async (_req, res, next) => {
  try {
    res.json(await getMembers())
  } catch (err) {
    next(err)
  }
})

/** POST /api/admin/members/invite — Supabase Auth invite + member row. */
adminMembersRouter.post('/admin/members/invite', async (req, res, next) => {
  const body = parseBody(memberInviteSchema, req.body, res)
  if (!body) return
  try {
    sendResult(res, await inviteMember(body.email), 201)
  } catch (err) {
    next(err)
  }
})

/** POST /api/admin/members/merge — fold a historical member into a real account. */
adminMembersRouter.post('/admin/members/merge', async (req, res, next) => {
  const body = parseBody(memberMergeSchema, req.body, res)
  if (!body) return
  try {
    sendResult(res, await mergeMembers(body.targetId, body.historicalId))
  } catch (err) {
    next(err)
  }
})

/** PATCH /api/admin/members/:id — edit division/coefficient/role/status/exemption. */
adminMembersRouter.patch('/admin/members/:id', async (req, res, next) => {
  const body = parseBody(memberPatchSchema, req.body, res)
  if (!body) return
  try {
    sendResult(res, await editMember(req.params.id, body))
  } catch (err) {
    next(err)
  }
})
