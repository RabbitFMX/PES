import { Router } from 'express'
import { signupSchema } from '../schemas/signup'
import { signUp } from '../services/signup'
import { parseBody, sendResult } from './admin/util'

/**
 * Public self-signup: POST /api/signup. Mounted WITHOUT the auth guard (it is
 * how a brand-new user gets their first member row); the invite-code check lives
 * in the service. Reuses the admin write helpers for the uniform `{ ok }`
 * response the frontend toasts on.
 */
export const signupRouter = Router()

signupRouter.post('/signup', async (req, res, next) => {
  const body = parseBody(signupSchema, req.body, res)
  if (!body) return
  try {
    sendResult(res, await signUp(body), 201)
  } catch (err) {
    next(err)
  }
})
