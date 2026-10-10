import { randomUUID } from 'node:crypto'

import { getDatabase, withTransaction } from '../database/db.js'
import { ApiError } from '../utils/apiError.js'

function fullName(row) {
  return [row.first_name, row.last_name].filter(Boolean).join(' ')
}

function toPublicUser(row) {
  if (!row) return null

  return {
    id: row.id,
    applicantId: row.applicant_id || null,
    email: row.email,
    fullName: row.full_name || fullName(row),
    role: row.role_id,
    accountStatus: row.account_status,
    emailVerified: Boolean(row.email_verified_at),
  }
}

function selectPublicUserById(db, id) {
  return db
    .prepare(
      `
        SELECT
          u.id,
          u.email,
          u.role_id,
          u.account_status,
          u.email_verified_at,
          u.locked_until,
          a.id AS applicant_id,
          a.first_name,
          a.last_name,
          s.full_name
        FROM users u
        LEFT JOIN applicants a ON a.user_id = u.id
        LEFT JOIN staff_profiles s ON s.user_id = u.id
        WHERE u.id = ?
      `,
    )
    .get(id)
}

export function findPublicUserById(id) {
  return toPublicUser(selectPublicUserById(getDatabase(), id))
}

export function findUserCredentialsByEmail(email) {
  return getDatabase()
    .prepare(
      `
        SELECT
          u.id,
          u.email,
          u.password_hash,
          u.role_id,
          u.account_status,
          u.email_verified_at,
          u.locked_until,
          a.id AS applicant_id,
          a.first_name,
          a.last_name,
          s.full_name
        FROM users u
        LEFT JOIN applicants a ON a.user_id = u.id
        LEFT JOIN staff_profiles s ON s.user_id = u.id
        WHERE u.email = ?
      `,
    )
    .get(email)
}

export function findOrCreateGoogleUser({ subject, email, fullName, audience }) {
  const db = getDatabase()
  let row = db
    .prepare('SELECT id FROM users WHERE google_identity_id = ? OR email = ?')
    .get(subject, email)
  if (!row) {
    if (audience === 'staff')
      throw new ApiError(403, 'STAFF_NOT_PROVISIONED', 'Ask an administrator to create your staff account before using Google Sign-In.')
    const parts = fullName.trim().split(/\s+/)
    return createApplicantAccount({
      email,
      passwordHash: null,
      firstName: parts.shift() || 'Google',
      lastName: parts.join(' ') || 'User',
      googleIdentityId: subject,
    })
  }
  const user = findPublicUserById(row.id)
  const staff = ['staff', 'admin'].includes(user.role)
  if ((audience === 'staff') !== staff)
    throw new ApiError(403, 'PORTAL_MISMATCH', `Use the ${staff ? 'staff' : 'applicant'} sign-in page for this account.`)
  db.prepare('UPDATE users SET google_identity_id = COALESCE(google_identity_id, ?), email_verified_at = COALESCE(email_verified_at, datetime(\'now\')) WHERE id = ?').run(subject, row.id)
  return findPublicUserById(row.id)
}

export function emailExists(email) {
  const row = getDatabase()
    .prepare('SELECT 1 AS found FROM users WHERE email = ? LIMIT 1')
    .get(email)

  return Boolean(row)
}

export function createApplicantAccount({
  email,
  passwordHash,
  firstName,
  lastName,
  googleIdentityId = null,
}) {
  if (emailExists(email)) {
    throw new ApiError(
      409,
      'EMAIL_EXISTS',
      'An account already exists for this email.',
    )
  }

  const userId = randomUUID()
  const applicantId = randomUUID()

  withTransaction((db) => {
    db.prepare(
      `
        INSERT INTO users (id, email, password_hash, google_identity_id, role_id, account_status, email_verified_at)
        VALUES (?, ?, ?, ?, 'applicant', 'active', CASE WHEN ? IS NULL THEN NULL ELSE datetime('now') END)
      `,
    ).run(userId, email, passwordHash, googleIdentityId, googleIdentityId)

    db.prepare(
      `
        INSERT INTO applicants (id, user_id, first_name, last_name)
        VALUES (?, ?, ?, ?)
      `,
    ).run(applicantId, userId, firstName, lastName)
  })

  return findPublicUserById(userId)
}

export function markLoginSuccess(userId) {
  getDatabase()
    .prepare(
      `
        UPDATE users
        SET last_login_at = datetime('now'),
            failed_login_count = 0,
            updated_at = datetime('now')
        WHERE id = ?
      `,
    )
    .run(userId)
}

export function markLoginFailure(userId) {
  if (!userId) return

  getDatabase()
    .prepare(
      `
        UPDATE users
        SET failed_login_count = failed_login_count + 1,
            locked_until = CASE WHEN failed_login_count >= 4 THEN datetime('now', '+15 minutes') ELSE locked_until END,
            updated_at = datetime('now')
        WHERE id = ?
      `,
    )
    .run(userId)
}

export function toAuthenticatedUser(row) {
  return toPublicUser(row)
}
