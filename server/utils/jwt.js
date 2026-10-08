import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { getDatabase } from '../database/db.js'

import { config } from '../config.js'
import { ApiError } from './apiError.js'

const ISSUER = 'gaps-auth-api'

export function createAccessToken(user) {
  const id = randomUUID()
  const token = jwt.sign(
    {
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
      issuer: ISSUER,
      subject: user.id,
      jwtid: id,
    },
  )
  const payload = jwt.decode(token)
  getDatabase()
    .prepare(
      'INSERT INTO auth_sessions (id, user_id, last_seen_at, expires_at) VALUES (?, ?, ?, ?)',
    )
    .run(id, user.id, Date.now(), payload.exp * 1000)
  return token
}

export function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      issuer: ISSUER,
      algorithms: ['HS256'],
    })
    const session = getDatabase()
      .prepare('SELECT * FROM auth_sessions WHERE id = ?')
      .get(payload.jti)
    if (
      !session ||
      session.revoked ||
      session.expires_at <= Date.now() ||
      Date.now() - session.last_seen_at > config.idleTimeoutMs
    )
      throw new Error('Session expired')
    getDatabase()
      .prepare('UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?')
      .run(Date.now(), payload.jti)
    return payload
  } catch {
    throw new ApiError(
      401,
      'INVALID_TOKEN',
      'Authentication token is invalid or expired.',
    )
  }
}

export function revokeAccessToken(token) {
  const payload = jwt.decode(token)
  if (payload?.jti)
    getDatabase()
      .prepare('UPDATE auth_sessions SET revoked = 1 WHERE id = ?')
      .run(payload.jti)
}
