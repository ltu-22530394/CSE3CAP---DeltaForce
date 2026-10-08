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
import {
  issueAccountEmail,
  consumeAccountToken,
} from '../integrations/accountEmails.js'
import { flushEmails, queueEmail } from '../integrations/email.js'
import { renderEmailTemplate } from '../integrations/emailTemplates.js'
import {
  installMicrosoftRoutes,
  microsoftConfigured,
} from '../integrations/microsoft.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import { validateLogin, validateRegistration } from '../utils/authValidation.js'

export const authRouter = Router()

authRouter.get('/configuration', (_req, res) =>
  res.json({
    microsoft: microsoftConfigured(),
    demoStaff: config.demoStaffEnabled,
    emailMode: config.emailMode,
  }),
)
installMicrosoftRoutes(authRouter)

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

    const verificationUrl = issueAccountEmail(user)
    await flushEmails()
    res.status(201).json({
      message: 'Applicant account created.',
      user,
      verificationUrl,
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
    if (
      ['staff', 'admin'].includes(credentials.role_id) &&
      (!config.demoStaffEnabled || credentials.email !== 'jamie@gap.example')
    )
      throw new ApiError(
        403,
        'SSO_REQUIRED',
        'Staff must use Microsoft sign-in.',
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
    if (!credentials.email_verified_at)
      throw new ApiError(
        403,
        'EMAIL_NOT_VERIFIED',
        'Verify your email address before logging in.',
      )

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

authRouter.post('/verify-email', (req, res) => {
  const user = consumeAccountToken(
    req.body?.token,
    'verification',
    (id, db) => {
      db.prepare(
        "UPDATE users SET email_verified_at = datetime('now') WHERE id = ?",
      ).run(id)
      return findPublicUserById(id)
    },
  )
  const template = renderEmailTemplate('email_verified', {
    name: user.fullName,
    link: config.appOrigin + '/login',
  })
  queueEmail({
    user,
    type: 'email_verification',
    subject: template.subject,
    body: `Hello ${user.fullName},\n\n${template.body}`,
  })
  void flushEmails()
  res.json({ message: 'Email verified. You can now log in.' })
})

authRouter.post(
  '/forgot-password',
  asyncRoute(async (req, res) => {
    const credentials = findUserCredentialsByEmail(
      String(req.body?.email || '')
        .trim()
        .toLowerCase(),
    )
    let verificationUrl
    if (
      credentials &&
      ['applicant', 'foster_carer'].includes(credentials.role_id)
    )
      verificationUrl = issueAccountEmail(
        toAuthenticatedUser(credentials),
        'reset',
      )
    await flushEmails()
    res.json({
      message:
        'If this account exists, a password reset link has been prepared.',
      verificationUrl,
    })
  }),
)

authRouter.post(
  '/resend-verification',
  asyncRoute(async (req, res) => {
    const credentials = findUserCredentialsByEmail(
      String(req.body?.email || '')
        .trim()
        .toLowerCase(),
    )
    let verificationUrl
    if (credentials && !credentials.email_verified_at)
      verificationUrl = issueAccountEmail(toAuthenticatedUser(credentials))
    await flushEmails()
    res.json({
      message:
        'If verification is needed, a new verification link has been prepared.',
      verificationUrl,
    })
  }),
)

authRouter.post(
  '/reset-password',
  asyncRoute(async (req, res) => {
    const password = String(req.body?.password || '')
    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72)
      throw new ApiError(
        400,
        'VALIDATION',
        'Password must contain at least 8 characters and at most 72 UTF-8 bytes.',
      )
    const hash = await hashPassword(password)
    consumeAccountToken(req.body?.token, 'reset', (id, db) => {
      db.prepare(
        'UPDATE users SET password_hash = ?, failed_login_count = 0, locked_until = NULL WHERE id = ?',
      ).run(hash, id)
      db.prepare('UPDATE auth_sessions SET revoked = 1 WHERE user_id = ?').run(
        id,
      )
      db.prepare(
        "UPDATE password_reset_tokens SET used_at = datetime('now') WHERE user_id = ?",
      ).run(id)
      recordAuditLog({
        actorUserId: id,
        action: 'auth.password_reset',
        entityType: 'user',
        entityId: id,
      })
    })
    res.json({ message: 'Password updated. Sign in with your new password.' })
  }),
)
