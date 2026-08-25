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
}) {
  if (emailExists(email)) {
    throw new ApiError(409, 'EMAIL_EXISTS', 'An account already exists for this email.')
  }

  const userId = randomUUID()
  const applicantId = randomUUID()

  withTransaction((db) => {
    db.prepare(
      `
        INSERT INTO users (id, email, password_hash, role_id, account_status)
        VALUES (?, ?, ?, 'applicant', 'active')
      `,
    ).run(userId, email, passwordHash)

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
            updated_at = datetime('now')
        WHERE id = ?
      `,
    )
    .run(userId)
}

export function toAuthenticatedUser(row) {
  return toPublicUser(row)
}
