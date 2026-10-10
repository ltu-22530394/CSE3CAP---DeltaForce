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
import { revokeAccessToken } from '../utils/jwt.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import {
  validateLogin,
  validateRegistration,
} from '../utils/authValidation.js'
import { publicSettings } from '../repositories/settingsRepository.js'
import {
  requestPasswordReset,
  resetPassword,
} from '../services/passwordRecovery.js'

export const authRouter = Router()

authRouter.get('/configuration', (_req, res) =>
  res.json({
    staffAuthentication: 'password',
    emailVerificationRequired: false,
    demoStaff: config.demoStaffEnabled,
    emailMode: config.emailMode,
  }),
)

authRouter.post(
  '/register',
  asyncRoute(async (req, res) => {
    if (!process.env.NODE_TEST_CONTEXT && !publicSettings().policyReady)
      throw new ApiError(
        503,
        'REGISTRATION_PAUSED',
        'Registration is temporarily unavailable while GAP finalises its privacy policy and terms of use.',
      )
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
      message: 'Applicant account created. You can now log in.',
      user,
    })
  }),
)

authRouter.post(
  '/login',
  asyncRoute(async (req, res) => {
    const { email, password, audience } = validateLogin(req.body)
    const credentials = findUserCredentialsByEmail(email)
    recordAuditLog({
      actorUserId: credentials?.id || null,
      action: 'auth.login_attempt',
      entityType: 'user',
      entityId: credentials?.id || null,
      req,
    })

    if (!credentials) {
      throw new ApiError(
        401,
        'INVALID_CREDENTIALS',
        'Email or password is incorrect.',
      )
    }

    if (credentials.account_status !== 'active') {
      throw new ApiError(
        403,
        'ACCOUNT_NOT_ACTIVE',
        'This account is not active.',
      )
    }
    if (
      credentials.locked_until &&
      Date.parse(credentials.locked_until + 'Z') > Date.now()
    )
      throw new ApiError(
        429,
        'LOGIN_LOCKED',
        'Too many login attempts. Try again in 15 minutes.',
      )
    const passwordMatches = await verifyPassword(
      password,
      credentials.password_hash || '',
    )

    if (!passwordMatches) {
      markLoginFailure(credentials.id)
      recordAuditLog({
        actorUserId: credentials.id,
        action: 'auth.login_failed',
        entityType: 'user',
        entityId: credentials.id,
        req,
      })
      throw new ApiError(
        401,
        'INVALID_CREDENTIALS',
        'Email or password is incorrect.',
      )
    }
    const staffAccount = ['staff', 'admin'].includes(credentials.role_id)
    if (audience && (audience === 'staff') !== staffAccount) {
      throw new ApiError(
        403,
        'PORTAL_MISMATCH',
        `Use the ${staffAccount ? 'staff' : 'applicant'} sign-in page for this account.`,
      )
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
  revokeAccessToken(req.get('authorization').split(' ')[1])
  recordAuditLog({
    actorUserId: req.user.id,
    action: 'auth.logout',
    entityType: 'user',
    entityId: req.user.id,
    req,
  })

  res.status(204).send()
})

authRouter.post(['/verify-email', '/resend-verification'], () => {
  throw new ApiError(
    410,
    'EMAIL_VERIFICATION_DISABLED',
    'Email verification is no longer required. Sign in with your email and password.',
  )
})
authRouter.post('/forgot-password', (req, res) => {
  requestPasswordReset(req.body?.email)
  res.status(202).json({
    message:
      'If an eligible account exists, password reset instructions have been queued.',
  })
})

authRouter.post(
  '/reset-password',
  asyncRoute(async (req, res) => {
    await resetPassword(req.body?.token, req.body?.password)
    res.json({ message: 'Your password has been reset. You can now sign in.' })
  }),
)
