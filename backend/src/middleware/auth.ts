import type { Express, NextFunction, Request, RequestHandler, Response, Router } from 'express'
import { supabase } from '../db/supabaseClient'
import { getMemberById } from '../db/members'
import type { MemberRow } from '../db/types'

/**
 * Authentication + authorization for the API.
 *
 * The client authenticates with Supabase Auth (email+password) and sends the
 * resulting JWT as `Authorization: Bearer <jwt>`. `requireAuth` verifies the
 * token with Supabase, resolves it to a `member` row (member.id === auth.users
 * id) and attaches it as `req.member`. `requireAdmin` gates admin-only routes.
 *
 * The Supabase call and the member lookup are injected via `AuthDeps` so tests
 * can drive the middleware without a live Supabase (mock `verifyToken`).
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      member?: MemberRow
    }
  }
}

/** A request past `requireAuth`, where `member` is guaranteed present. */
export interface AuthedRequest extends Request {
  member: MemberRow
}

export interface AuthDeps {
  /** Verify a JWT and return the auth user id, or null if invalid. */
  verifyToken: (jwt: string) => Promise<{ userId: string } | null>
  /** Resolve an auth user id to a member row, or null if not a member. */
  getMember: (id: string) => Promise<MemberRow | null>
}

const defaultDeps: AuthDeps = {
  verifyToken: async (jwt) => {
    const { data, error } = await supabase.auth.getUser(jwt)
    if (error || !data.user) return null
    return { userId: data.user.id }
  },
  getMember: (id) => getMemberById(id),
}

function readBearer(req: Request): string | null {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  return token.length > 0 ? token : null
}

/**
 * Guard: require a valid Supabase JWT that maps to a member.
 * - missing/invalid token        → 401 unauthorized
 * - valid token but no member row → 403 not_a_member (invite-only, no
 *   auto-provisioning — project-brief §11)
 */
export function requireAuth(deps: AuthDeps = defaultDeps): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = readBearer(req)
    if (!token) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }

    let userId: string
    try {
      const verified = await deps.verifyToken(token)
      if (!verified) {
        res.status(401).json({ error: 'unauthorized' })
        return
      }
      userId = verified.userId
    } catch {
      res.status(401).json({ error: 'unauthorized' })
      return
    }

    const member = await deps.getMember(userId)
    if (!member) {
      res.status(403).json({ error: 'not_a_member' })
      return
    }

    req.member = member
    next()
  }
}

/**
 * Opportunistic auth for PUBLIC routes: if a valid Supabase JWT resolving to a
 * member is present, attach `req.member`; otherwise continue anonymously. Never
 * rejects — used by routes that serve both logged-in and anonymous callers
 * (e.g. the consent endpoint, which records a member_id only when one is known).
 */
export function optionalAuth(deps: AuthDeps = defaultDeps): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const token = readBearer(req)
    if (!token) {
      next()
      return
    }
    try {
      const verified = await deps.verifyToken(token)
      if (verified) {
        const member = await deps.getMember(verified.userId)
        if (member) req.member = member
      }
    } catch {
      // Ignore — treat as anonymous.
    }
    next()
  }
}

/** Guard: require the authenticated member to be an admin. Runs after requireAuth. */
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.member) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  if (req.member.role !== 'admin') {
    res.status(403).json({ error: 'forbidden' })
    return
  }
  next()
}

/**
 * Mount a router behind the auth guards. `admin: true` also requires the admin
 * role. `deps` is for tests; production uses the default Supabase-backed deps.
 */
export function mountProtected(
  app: Express,
  path: string,
  router: Router,
  opts: { admin?: boolean; deps?: AuthDeps } = {},
): void {
  const guards: RequestHandler[] = [requireAuth(opts.deps)]
  if (opts.admin) guards.push(requireAdmin)
  app.use(path, ...guards, router)
}
