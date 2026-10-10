import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { config } from '../config.js'
import { getDatabase, withTransaction } from '../database/db.js'
import { recordAuditLog } from '../repositories/auditRepository.js'

export function bootstrapAdmin() {
  const email = config.bootstrapAdminEmail
  const name = config.bootstrapAdminName
  const password = config.bootstrapAdminPassword
  if (!email && !name && !password) return
  const db = getDatabase()
  // Only the exact active, passwordless administrator can migrate from SSO.
  const existing = db
    .prepare(
      "SELECT id, password_hash, account_status FROM users WHERE email = ? AND role_id = 'admin'",
    )
    .get(email)
  if (existing?.password_hash || existing?.account_status === 'disabled')
    return
  if (
    !existing &&
    db.prepare("SELECT 1 FROM users WHERE role_id = 'admin'").get()
  )
    return
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    name.length < 2 ||
    name.length > 160 ||
    password.length < 16 ||
    Buffer.byteLength(password, 'utf8') > 72
  )
    throw new Error(
      'Set BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME and a unique BOOTSTRAP_ADMIN_PASSWORD of 16 characters or more (maximum 72 UTF-8 bytes).',
    )
  if (
    !existing &&
    db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)
  )
    throw new Error(
      'The bootstrap email already has an account. Use a separate administrator email; existing accounts are never promoted automatically.',
    )
  const passwordHash = bcrypt.hashSync(password, config.passwordSaltRounds)
  withTransaction(() => {
    if (existing) {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
        passwordHash,
        existing.id,
      )
      db.prepare(
        'UPDATE auth_sessions SET revoked = 1 WHERE user_id = ?',
      ).run(existing.id)
      recordAuditLog({
        actorUserId: existing.id,
        action: 'staff.password_initialized',
        entityType: 'user',
        entityId: existing.id,
        newValue: { email },
      })
      return
    }
    const id = randomUUID()
    db.prepare(
      "INSERT INTO users (id, email, password_hash, role_id) VALUES (?, ?, ?, 'admin')",
    ).run(id, email, passwordHash)
    db.prepare(
      'INSERT INTO staff_profiles (id, user_id, full_name) VALUES (?, ?, ?)',
    ).run(randomUUID(), id, name)
    recordAuditLog({
      actorUserId: id,
      action: 'staff.bootstrap_admin',
      entityType: 'user',
      entityId: id,
      newValue: { email, name, role: 'admin' },
    })
  })
}
