import cors from 'cors'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { portalRouter } from './routes/portalRoutes.js'
import { seedDemoStaff } from './scripts/seed-demo.js'
import helmet from 'helmet'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { managementRouter } from './routes/managementRoutes.js'
import { seedEmailTemplates } from './integrations/emailTemplates.js'

import { config } from './config.js'
import { initializeDatabase } from './database/db.js'
import { authRouter } from './routes/authRoutes.js'
import { protectedRouter } from './routes/protectedRoutes.js'
import { applicationRouter } from './routes/applicationRoutes.js'
import { ApiError } from './utils/apiError.js'

export function createApp() {
  initializeDatabase()
  seedDemoStaff()
  seedEmailTemplates()

  const app = express()
  app.set('trust proxy', config.trustProxy)
  app.use(
    helmet({
      strictTransportSecurity: config.production ? undefined : false,
      contentSecurityPolicy: config.production
        ? {
            directives: {
              'img-src': ["'self'", 'data:', 'https:'],
              'style-src': ["'self'", "'unsafe-inline'"],
            },
          }
        : false,
    }),
  )
  app.use((req, res, next) => {
    if (config.production && !req.secure && req.path !== '/api/health')
      return res.status(403).json({
        error: {
          code: 'HTTPS_REQUIRED',
          message: 'Use the secure HTTPS portal.',
        },
      })
    if (
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
      req.get('origin') &&
      req.get('origin') !== config.appOrigin
    )
      return res.status(403).json({
        error: {
          code: 'INVALID_ORIGIN',
          message: 'This request origin is not permitted.',
        },
      })
    next()
  })

  app.use(
    cors({
      origin: config.appOrigin,
      credentials: true,
    }),
  )
  app.disable('x-powered-by')
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    res.set('Referrer-Policy', 'no-referrer')
    next()
  })
  app.use(express.json({ limit: '2mb' }))
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: process.env.NODE_ENV === 'test' ? 1000 : 60,
      skip: (req) =>
        req.method === 'GET' && ['/me', '/configuration'].includes(req.path),
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many authentication requests. Try again later.',
        },
      },
    }),
  )
  app.use(
    '/api/portal/apply',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: process.env.NODE_ENV === 'test' ? 1000 : 10,
      legacyHeaders: false,
      standardHeaders: 'draft-8',
    }),
  )

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'gaps-auth-api' })
  })

  app.use('/api/auth', authRouter)
  app.use('/api/portal', managementRouter)
  app.use('/api/portal', portalRouter)
  app.use('/api/applications', applicationRouter)
  app.use('/api/protected', protectedRouter)

  if (config.production) {
    const dist = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../dist',
    )
    if (fs.existsSync(path.join(dist, 'index.html'))) {
      app.use(express.static(dist, { index: false }))
      app.get('/{*path}', (req, res, next) =>
        req.path.startsWith('/api/')
          ? next()
          : res.sendFile(path.join(dist, 'index.html')),
      )
    }
  }

  app.use((_req, _res, next) => {
    next(new ApiError(404, 'NOT_FOUND', 'API route could not be found.'))
  })

  app.use((error, _req, res, _next) => {
    const statusCode =
      error instanceof ApiError
        ? error.statusCode
        : error.type === 'entity.too.large'
          ? 413
          : error instanceof SyntaxError && error.status === 400
            ? 400
            : 500
    const code = error instanceof ApiError ? error.code : 'INTERNAL_ERROR'
    const message =
      error instanceof ApiError
        ? error.message
        : statusCode === 413
          ? 'The uploaded data exceeds the size limit.'
          : statusCode === 400
            ? 'The request must contain valid JSON.'
            : 'Something went wrong while processing the request.'

    if (statusCode >= 500) {
      console.error('API request failed:', code)
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
