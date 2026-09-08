import cors from 'cors'
import express from 'express'

import { config } from './config.js'
import { initializeDatabase } from './database/db.js'
import { authRouter } from './routes/authRoutes.js'
import { protectedRouter } from './routes/protectedRoutes.js'
import { applicationRouter } from './routes/applicationRoutes.js'
import { staffRouter } from './routes/staffRoutes.js'
import { ApiError } from './utils/apiError.js'

export function createApp() {
  initializeDatabase()

  const app = express()

  app.use(
    cors({
      origin: config.appOrigin,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'gaps-auth-api' })
  })

  app.use('/api/auth', authRouter)
  app.use('/api/applications', applicationRouter)
  app.use('/api/staff', staffRouter)
  app.use('/api/protected', protectedRouter)

  app.use((_req, _res, next) => {
    next(new ApiError(404, 'NOT_FOUND', 'API route could not be found.'))
  })

  app.use((error, _req, res, _next) => {
    const statusCode = error instanceof ApiError ? error.statusCode : 500
    const code = error instanceof ApiError ? error.code : 'INTERNAL_ERROR'
    const message =
      error instanceof ApiError
        ? error.message
        : 'Something went wrong while processing the request.'

    if (statusCode >= 500) {
      console.error(error)
    }

    res.status(statusCode).json({
      error: {
        code,
        message,
        ...(error.details ? { details: error.details } : {}),
      },
    })
  })

  return app
}
