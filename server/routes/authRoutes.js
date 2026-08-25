import { Router } from 'express'

import { config } from '../config.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { recordAuditLog } from '../repositories/auditRepository.js'
import {
  createApplicantAccount,
  findPublicUserById,
  findUserCredentialsByEmail,
  markLoginFailure,
  markLoginSuccess,
  toAuthenticatedUser,
} from '../repositories/userRepository.js'
import { ApiError, asyncRoute } from '../utils/apiError.js'
import { createAccessToken } from '../utils/jwt.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import { validateLogin, validateRegistration } from '../utils/authValidation.js'

export const authRouter = Router()

authRouter.post(
  '/register',
  asyncRoute(async (req, res) => {
    const input = validateRegistration(req.body)
    const passwordHash = await hashPassword(input.password)
    const user = createApplicantAccount({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash,
    })

    recordAuditLog({
      actorUserId: user.id,
      action: 'account.created',
      entityType: 'user',
      entityId: user.id,
      newValue: { email: user.email, role: user.role },
      req,
    })

    res.status(201).json({
      message: 'Applicant account created.',
      user,
    })
  }),
)

authRouter.post(
  '/login',
  asyncRoute(async (req, res) => {
    const { email, password } = validateLogin(req.body)
    const credentials = findUserCredentialsByEmail(email)

    if (!credentials) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.')
    }

    if (credentials.account_status !== 'active') {
      throw new ApiError(403, 'ACCOUNT_NOT_ACTIVE', 'This account is not active.')
    }

    const passwordMatches = await verifyPassword(password, credentials.password_hash || '')

    if (!passwordMatches) {
      markLoginFailure(credentials.id)
      recordAuditLog({
        actorUserId: credentials.id,
        action: 'auth.login_failed',
        entityType: 'user',
        entityId: credentials.id,
        req,
      })
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.')
    }

    markLoginSuccess(credentials.id)
    const user = toAuthenticatedUser(credentials)
    const token = createAccessToken(user)

    recordAuditLog({
      actorUserId: user.id,
      action: 'auth.login_success',
      entityType: 'user',
      entityId: user.id,
      req,
    })

    res.json({
      message: 'Login successful.',
      token,
      tokenType: 'Bearer',
      expiresIn: config.jwtExpiresIn,
      user,
    })
  }),
)

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: findPublicUserById(req.user.id) })
})

authRouter.post('/logout', requireAuth, (req, res) => {
  recordAuditLog({
    actorUserId: req.user.id,
    action: 'auth.logout',
    entityType: 'user',
    entityId: req.user.id,
    req,
  })

  res.status(204).send()
})
