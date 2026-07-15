import cors from 'cors'
import express from 'express'
import { activitiesRouter } from './routes/activities'
import { challengesRouter } from './routes/challenges'
import { dashboardRouter } from './routes/dashboard'
import { healthRouter } from './routes/health'
import { leaderboardRouter } from './routes/leaderboard'
import { logEntriesRouter } from './routes/logEntries'
import { meRouter } from './routes/me'
import { statsRouter } from './routes/stats'
import { mountProtected } from './middleware/auth'
import { errorHandler } from './middleware/errorHandler'

export function createApp() {
  const app = express()

  // Allow the frontend dev origin; configurable so deploys can point at the
  // real domain. Defaults to the Vite dev server URL.
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173'

  app.use(cors({ origin: corsOrigin }))
  app.use(express.json())

  // Public routes.
  app.use('/api', healthRouter)

  // Protected routes (require a valid Supabase JWT resolving to a member).
  mountProtected(app, '/api', meRouter)
  mountProtected(app, '/api', activitiesRouter)
  mountProtected(app, '/api', logEntriesRouter)
  mountProtected(app, '/api', dashboardRouter)
  mountProtected(app, '/api', leaderboardRouter)
  mountProtected(app, '/api', statsRouter)
  mountProtected(app, '/api', challengesRouter)

  // Error handler last.
  app.use(errorHandler)

  return app
}
