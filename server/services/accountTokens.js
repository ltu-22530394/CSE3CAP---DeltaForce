import { randomBytes, createHash } from 'node:crypto'
import { getDatabase, withTransaction } from '../database/db.js'
import { config } from '../config.js'
import { ApiError } from '../utils/apiError.js'
import { hashPassword } from '../utils/password.js'
import { queueMail } from './mail.js'
const digest = (value) => createHash('sha256').update(value).digest('hex')
const tables = {
  password_reset: 'password_reset_tokens',
  email_verification: 'email_verification_tokens',
}
export function issueAccountToken(user, type, db = getDatabase()) {
  const table = tables[type],
    token = randomBytes(32).toString('hex')
  if (!table) throw new Error('Invalid token purpose')
  db.prepare(
    `UPDATE ${table} SET used_at=datetime('now') WHERE user_id=? AND used_at IS NULL`,
  ).run(user.id)
  db.prepare(
    `INSERT INTO ${table} (user_id,token_hash,expires_at) VALUES (?,?,?)`,
  ).run(
    user.id,
    digest(token),
    new Date(
      Date.now() + (type === 'password_reset' ? 30 * 60000 : 24 * 3600000),
    ).toISOString(),
  )
  const path = type === 'password_reset' ? 'reset-password' : 'verify-email'
  queueMail(
    {
      userId: user.id,
      email: user.email,
      type,
      subject:
        type === 'password_reset'
          ? 'Reset your GAP password'
          : 'Verify your GAP email',
      text: `Open ${config.appOrigin}${config.appBasePath}/${path}#token=${token}\nThis link can be used once. If you did not request it, ignore this message.`,
      eventKey: `${type}:${digest(token)}`,
    },
    db,
  )
}
export function requestAccountToken(email, type) {
  withTransaction((db) => {
    const user = db
      .prepare('SELECT * FROM users WHERE email=?')
      .get(typeof email === 'string' ? email.trim().toLowerCase() : '')
    if (
      !user ||
      !['active', 'pending_verification'].includes(user.account_status) ||
      (type === 'email_verification' && user.email_verified_at)
    )
      return
    const recent = db
      .prepare(
        `SELECT 1 FROM ${tables[type]} WHERE user_id=? AND created_at > datetime('now','-1 minute')`,
      )
      .get(user.id)
    if (!recent) issueAccountToken(user, type, db)
  })
}
export async function consumeAccountToken(token, type, password) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
    throw new ApiError(
      400,
      'INVALID_LINK',
      'This link is invalid or expired. Request a new link.',
    )
  if (
    type === 'password_reset' &&
    (typeof password !== 'string' ||
      password.length < 8 ||
      Buffer.byteLength(password) > 72)
  )
    throw new ApiError(
      400,
      'VALIDATION',
      'Use a password of at least 8 characters and at most 72 bytes.',
    )
  const passwordHash =
    type === 'password_reset' ? await hashPassword(password) : null
  withTransaction((db) => {
    const table = tables[type]
    const row = db
      .prepare(
        `SELECT t.*,u.account_status FROM ${table} t JOIN users u ON u.id=t.user_id WHERE token_hash=? AND used_at IS NULL AND expires_at > ?`,
      )
      .get(digest(token), new Date().toISOString())
    if (
      !row ||
      !['active', 'pending_verification'].includes(row.account_status)
    )
      throw new ApiError(
        400,
        'INVALID_LINK',
        'This link is invalid or expired. Request a new link.',
      )
    db.prepare(
      `UPDATE ${table} SET used_at=datetime('now') WHERE user_id=? AND used_at IS NULL`,
    ).run(row.user_id)
    if (type === 'password_reset') {
      db.prepare(
        `UPDATE users SET password_hash=?,token_version=token_version+1,failed_login_count=0,updated_at=datetime('now') WHERE id=?`,
      ).run(passwordHash, row.user_id)
      db.prepare(
        `UPDATE auth_refresh_tokens SET revoked_at=datetime('now') WHERE user_id=?`,
      ).run(row.user_id)
    } else
      db.prepare(
        `UPDATE users SET email_verified_at=datetime('now'),account_status='active',updated_at=datetime('now') WHERE id=?`,
      ).run(row.user_id)
  })
}
