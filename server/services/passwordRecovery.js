import { createHash, randomBytes } from 'node:crypto'
import { config } from '../config.js'
import { withTransaction } from '../database/db.js'
import { queueEmail } from '../integrations/email.js'
import { ApiError } from '../utils/apiError.js'
import { hashPassword } from '../utils/password.js'

const digest = (value) => createHash('sha256').update(value).digest('hex')

export function requestPasswordReset(email) {
  withTransaction((db) => {
    const user = db
      .prepare(
        "SELECT id, email, email AS fullName FROM users WHERE email = ? AND account_status = 'active'",
      )
      .get(typeof email === 'string' ? email.trim().toLowerCase() : '')
    if (!user) return

    const recent = db
      .prepare(
        "SELECT 1 FROM password_reset_tokens WHERE user_id = ? AND created_at > datetime('now', '-1 minute')",
      )
      .get(user.id)
    if (recent) return

    const token = randomBytes(32).toString('hex')
    db.prepare(
      "UPDATE password_reset_tokens SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL",
    ).run(user.id)
    db.prepare(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    ).run(user.id, digest(token), new Date(Date.now() + 30 * 60_000).toISOString())
    queueEmail({
      user,
      type: 'password_reset',
      subject: 'Reset your GAP password',
      body: `Open ${config.appOrigin}/reset-password#token=${token}\n\nThis one-time link expires in 30 minutes. If you did not request it, ignore this message.`,
    })
  })
}

export async function resetPassword(token, password) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
    throw new ApiError(
      400,
      'INVALID_LINK',
      'This reset link is invalid or expired. Request a new link.',
    )
  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    Buffer.byteLength(password) > 72
  )
    throw new ApiError(
      400,
      'VALIDATION',
      'Use a password of at least 8 characters and at most 72 UTF-8 bytes.',
    )

  const passwordHash = await hashPassword(password)
  withTransaction((db) => {
    const row = db
      .prepare(
        "SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')",
      )
      .get(digest(token))
    if (!row)
      throw new ApiError(
        400,
        'INVALID_LINK',
        'This reset link is invalid or expired. Request a new link.',
      )
    db.prepare(
      "UPDATE password_reset_tokens SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL",
    ).run(row.user_id)
    db.prepare(
      "UPDATE users SET password_hash = ?, token_version = token_version + 1, failed_login_count = 0, locked_until = NULL, updated_at = datetime('now') WHERE id = ?",
    ).run(passwordHash, row.user_id)
    db.prepare(
      "UPDATE auth_refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL",
    ).run(row.user_id)
  })
}
