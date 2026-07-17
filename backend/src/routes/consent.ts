import { Router } from 'express'
import { consentRequestSchema } from '../schemas/consent'
import { recordConsent } from '../services/consent'

/**
 * POST /api/consent — record a consent decision (cookie banner or a profile
 * Privacy withdrawal). Mounted PUBLIC but behind `optionalAuth`: it must work
 * for an anonymous visitor (member_id null), yet when a valid Supabase JWT is
 * present the member is attached, so the audit row and the account's current
 * consent flags are linked. The client IP is hashed in the service before it is
 * stored (data minimisation).
 */
export const consentRouter = Router()

consentRouter.post('/consent', async (req, res, next) => {
  try {
    const body = consentRequestSchema.parse(req.body)
    await recordConsent(body, {
      memberId: req.member?.id ?? null,
      ip: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    })
    res.status(201).json({ ok: true })
  } catch (err) {
    next(err)
  }
})
