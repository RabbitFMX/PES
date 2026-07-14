import cors from 'cors'
import express from 'express'
import { healthRouter } from './routes/health'
import { errorHandler } from './middleware/errorHandler'

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.use('/api', healthRouter)

  app.use(errorHandler)

  return app
}
