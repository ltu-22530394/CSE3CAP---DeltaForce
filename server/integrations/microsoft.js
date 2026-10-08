import * as oidc from 'openid-client'
import { randomBytes, createHash, randomUUID } from 'node:crypto'
import { config } from '../config.js'
import { getDatabase, withTransaction } from '../database/db.js'
import { ApiError, asyncRoute } from '../utils/apiError.js'
import { findPublicUserById } from '../repositories/userRepository.js'
import { recordAuditLog } from '../repositories/auditRepository.js'
import { createAccessToken } from '../utils/jwt.js'

export const hashToken = (token) =>
  createHash('sha256').update(token).digest('hex')
export const randomToken = () => randomBytes(32).toString('base64url')
export const microsoftConfigured = () =>
  Boolean(
    config.microsoftTenantId &&
    config.microsoftClientId &&
    config.microsoftClientSecret &&
    (config.microsoftStaffIds.length ||
      getDatabase()
        .prepare(
          'SELECT 1 FROM staff_profiles WHERE microsoft_identity_id IS NOT NULL LIMIT 1',
        )
        .get()),
  )
let discovery
async function microsoftClient() {
  if (!microsoftConfigured())
    throw new ApiError(
      503,
      'SSO_NOT_CONFIGURED',
      'Microsoft sign-in is awaiting the client tenant settings and authorised staff object IDs.',
    )
  discovery ||= oidc
    .discovery(
      new URL(
        `https://login.microsoftonline.com/${encodeURIComponent(config.microsoftTenantId)}/v2.0`,
      ),
      config.microsoftClientId,
      config.microsoftClientSecret,
    )
    .then((client) => {
      oidc.enableNonRepudiationChecks(client)
      return client
    })
  try {
    return await discovery
  } catch {
    discovery = null
    throw new ApiError(
      502,
      'SSO_UNAVAILABLE',
      'Microsoft sign-in is temporarily unavailable.',
    )
  }
}

export function authorisedMicrosoftStaff(claims) {
  const db = getDatabase()
  const known =
    typeof claims.oid === 'string' &&
    db
      .prepare(
        'SELECT user_id FROM staff_profiles WHERE microsoft_identity_id = ?',
      )
      .get(claims.oid)
  if (
    claims.tid !== config.microsoftTenantId ||
    typeof claims.oid !== 'string' ||
    (!config.microsoftStaffIds.includes(claims.oid) && !known)
  )
    throw new ApiError(
      403,
      'FORBIDDEN',
      'This Microsoft account is not authorised as GAP staff.',
    )
  const existing = db
    .prepare(
      'SELECT u.id, u.account_status FROM users u JOIN staff_profiles s ON s.user_id = u.id WHERE s.microsoft_identity_id = ?',
    )
    .get(claims.oid)
  if (existing) {
    if (existing.account_status !== 'active')
      throw new ApiError(
        403,
        'ACCOUNT_NOT_ACTIVE',
        'This staff account is disabled.',
      )
    const user = findPublicUserById(existing.id)
    if (!['staff', 'admin'].includes(user.role))
      throw new ApiError(403, 'FORBIDDEN', 'Staff access is not permitted.')
    return user
  }
  const email = String(claims.preferred_username || claims.email || '')
    .trim()
    .toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new ApiError(
      403,
      'SSO_EMAIL',
      'Microsoft did not provide a valid staff email.',
    )
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email))
    throw new ApiError(
      403,
      'SSO_ACCOUNT_LINK',
      'This email already belongs to an account. Ask an administrator to resolve the identity link.',
    )
  const id = randomUUID()
  withTransaction(() => {
    db.prepare(
      "INSERT INTO users (id, email, role_id, email_verified_at) VALUES (?, ?, ?, datetime('now'))",
    ).run(
      id,
      email,
      config.microsoftAdminIds.includes(claims.oid) ? 'admin' : 'staff',
    )
    db.prepare(
      'INSERT INTO staff_profiles (id, user_id, microsoft_identity_id, full_name) VALUES (?, ?, ?, ?)',
    ).run(randomUUID(), id, claims.oid, String(claims.name || email))
    recordAuditLog({
      actorUserId: id,
      action: 'staff.created',
      entityType: 'user',
      entityId: id,
    })
  })
  return findPublicUserById(id)
}

export function installMicrosoftRoutes(router) {
  router.get(
    '/microsoft/start',
    asyncRoute(async (_req, res) => {
      const client = await microsoftClient()
      const state = oidc.randomState(),
        verifier = oidc.randomPKCECodeVerifier(),
        nonce = oidc.randomNonce()
      const db = getDatabase()
      db.prepare('DELETE FROM microsoft_login_flows WHERE expires_at < ?').run(
        Date.now(),
      )
      db.prepare(
        'INSERT INTO microsoft_login_flows (state, verifier, nonce, expires_at) VALUES (?, ?, ?, ?)',
      ).run(state, verifier, nonce, Date.now() + 600000)
      res.cookie('gap_oidc', state, {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.production,
        maxAge: 600000,
        path: '/api/auth/microsoft',
      })
      res.redirect(
        oidc.buildAuthorizationUrl(client, {
          redirect_uri: config.microsoftRedirectUri,
          scope: 'openid profile email',
          state,
          nonce,
          code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
          code_challenge_method: 'S256',
        }).href,
      )
    }),
  )
  router.get(
    '/microsoft/callback',
    asyncRoute(async (req, res) => {
      const state = typeof req.query.state === 'string' ? req.query.state : ''
      const cookie = req
        .get('cookie')
        ?.split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith('gap_oidc='))
        ?.slice(9)
      const db = getDatabase()
      const flow = db
        .prepare('SELECT * FROM microsoft_login_flows WHERE state = ?')
        .get(state)
      if (!flow || flow.expires_at < Date.now() || cookie !== state)
        throw new ApiError(
          400,
          'INVALID_SSO_STATE',
          'The sign-in request expired. Start again.',
        )
      db.prepare('DELETE FROM microsoft_login_flows WHERE state = ?').run(state)
      res.clearCookie('gap_oidc', { path: '/api/auth/microsoft' })
      try {
        const url = new URL(config.microsoftRedirectUri)
        url.search = new URL(req.originalUrl, config.appOrigin).search
        const tokens = await oidc.authorizationCodeGrant(
          await microsoftClient(),
          url,
          {
            pkceCodeVerifier: flow.verifier,
            expectedState: state,
            expectedNonce: flow.nonce,
            idTokenExpected: true,
          },
        )
        const user = authorisedMicrosoftStaff(tokens.claims())
        const code = randomToken()
        db.prepare(
          'INSERT INTO microsoft_login_codes (code_hash, user_id, expires_at) VALUES (?, ?, ?)',
        ).run(hashToken(code), user.id, Date.now() + 60000)
        recordAuditLog({
          actorUserId: user.id,
          action: 'auth.microsoft_login',
          entityType: 'user',
          entityId: user.id,
        })
        res.redirect(config.appOrigin + '/staff/login#sso=' + code)
      } catch (error) {
        if (error instanceof ApiError) throw error
        throw new ApiError(
          401,
          'SSO_FAILED',
          'Microsoft sign-in could not be verified. Please start again.',
        )
      }
    }),
  )
  router.post('/microsoft/exchange', (req, res) => {
    const code = String(req.body?.code || '')
    const db = getDatabase()
    const handoff = db
      .prepare(
        'DELETE FROM microsoft_login_codes WHERE code_hash = ? AND expires_at > ? RETURNING user_id',
      )
      .get(hashToken(code), Date.now())
    if (!handoff)
      throw new ApiError(
        401,
        'INVALID_SSO_CODE',
        'The sign-in code expired or was already used.',
      )
    const user = findPublicUserById(handoff.user_id)
    if (
      !user ||
      user.accountStatus !== 'active' ||
      !['staff', 'admin'].includes(user.role)
    )
      throw new ApiError(403, 'FORBIDDEN', 'Staff access is not permitted.')
    res.json({ token: createAccessToken(user), user })
  })
}
