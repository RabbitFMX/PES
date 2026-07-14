import cors from 'cors'
import express from 'express'
import { activitiesRouter } from './routes/activities'
import { healthRouter } from './routes/health'
import { meRouter } from './routes/me'
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

  // Error handler last.
  app.use(errorHandler)

  return app
}
