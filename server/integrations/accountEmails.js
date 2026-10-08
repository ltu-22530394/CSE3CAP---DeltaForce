import { randomUUID } from 'node:crypto'
import { getDatabase, withTransaction } from '../database/db.js'
import { config } from '../config.js'
import { hashToken, randomToken } from './microsoft.js'
import { queueEmail } from './email.js'
import { ApiError } from '../utils/apiError.js'
import { renderEmailTemplate } from './emailTemplates.js'

export function issueAccountEmail(user, purpose = 'verification') {
  const token = randomToken()
  const verify = purpose === 'verification'
  const table = verify ? 'email_verification_tokens' : 'password_reset_tokens'
  const url = `${config.appOrigin}/${verify ? 'verify-email' : 'reset-password'}#token=${token}`
  getDatabase()
    .prepare(
      `INSERT INTO ${table} (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      user.id,
      hashToken(token),
      new Date(Date.now() + (verify ? 86400000 : 3600000)).toISOString(),
    )
  const template = renderEmailTemplate(
    verify ? 'email_verification' : 'password_reset',
    { name: user.fullName, link: url },
  )
  queueEmail({
    user,
    type: verify ? 'email_verification' : 'password_reset',
    subject: template.subject,
    body: `Hello ${user.fullName},\n\n${template.body}\n\nGreyhounds as Pets`,
  })
  return config.emailMode === 'preview' && !config.production ? url : undefined
}

export function consumeAccountToken(token, purpose, work) {
  if (typeof token !== 'string' || token.length > 200)
    throw new ApiError(
      400,
      'INVALID_TOKEN',
      'This link is invalid or has expired.',
    )
  const table =
    purpose === 'verification'
      ? 'email_verification_tokens'
      : 'password_reset_tokens'
  return withTransaction((db) => {
    const row = db
      .prepare(
        `SELECT * FROM ${table} WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?`,
      )
      .get(hashToken(token), new Date().toISOString())
    if (!row)
      throw new ApiError(
        400,
        'INVALID_TOKEN',
        'This link is invalid, expired, or already used.',
      )
    db.prepare(
      `UPDATE ${table} SET used_at = datetime('now') WHERE id = ?`,
    ).run(row.id)
    db.prepare(
      `UPDATE ${table} SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL`,
    ).run(row.user_id)
    return work(row.user_id, db)
  })
}
