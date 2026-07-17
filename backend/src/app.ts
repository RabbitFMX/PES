import cors from 'cors'
import express from 'express'
import { activitiesRouter } from './routes/activities'
import { adminRouter } from './routes/admin'
import { challengesRouter } from './routes/challenges'
import { consentRouter } from './routes/consent'
import { dashboardRouter } from './routes/dashboard'
import { healthRouter } from './routes/health'
import { leaderboardRouter } from './routes/leaderboard'
import { logEntriesRouter } from './routes/logEntries'
import { meRouter } from './routes/me'
import { membersRouter } from './routes/members'
import { packStatsRouter } from './routes/packStats'
import { signupRouter } from './routes/signup'
import { statsRouter } from './routes/stats'
import { mountProtected, optionalAuth } from './middleware/auth'
import { errorHandler } from './middleware/errorHandler'
import { testModeMiddleware } from './middleware/testMode'

export function createApp() {
  const app = express()

  // Behind Traefik in production, so trust the proxy to get the real client IP
  // from X-Forwarded-For — the consent log hashes it (data minimisation).
  app.set('trust proxy', true)

  // Allow the frontend dev origin; configurable so deploys can point at the
  // real domain. Defaults to the Vite dev server URL.
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173'

  app.use(cors({ origin: corsOrigin }))
  app.use(express.json())
  // Read-only "test data" toggle: when the request carries X-PES-Test-Data,
  // detailed stats are served from generated data (see middleware/testMode.ts).
  app.use(testModeMiddleware)

  // Public routes (no auth — signup is how a new user gets their first member row).
  app.use('/api', healthRouter)
  app.use('/api', signupRouter)
  // Public, but opportunistically authenticated: records member_id when a valid
  // token is present, otherwise logs an anonymous consent decision.
  app.use('/api', optionalAuth(), consentRouter)

  // Protected routes (require a valid Supabase JWT resolving to a member).
  mountProtected(app, '/api', meRouter)
  mountProtected(app, '/api', activitiesRouter)
  mountProtected(app, '/api', logEntriesRouter)
  mountProtected(app, '/api', dashboardRouter)
  mountProtected(app, '/api', leaderboardRouter)
  mountProtected(app, '/api', statsRouter)
  mountProtected(app, '/api', packStatsRouter)
  mountProtected(app, '/api', membersRouter)
  mountProtected(app, '/api', challengesRouter)

  // Admin routes: same auth, plus the admin-role guard.
  mountProtected(app, '/api', adminRouter, { admin: true })

  // Error handler last.
  app.use(errorHandler)

  return app
}
