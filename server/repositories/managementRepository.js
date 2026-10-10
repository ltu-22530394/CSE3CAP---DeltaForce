import { randomUUID } from 'node:crypto'
import { getDatabase, withTransaction } from '../database/db.js'
import { ApiError } from '../utils/apiError.js'
import { recordAuditLog } from './auditRepository.js'
import { validDate } from '../utils/dates.js'
import {
  staffApplication,
  applicantApplication,
} from './portalRepository.js'
import { applicationEmail } from '../integrations/email.js'
import { hashPassword } from '../utils/password.js'

const text = (value, max = 4000) => {
  if (typeof value !== 'string' || value.trim().length > max)
    throw new ApiError(
      400,
      'VALIDATION',
      'Enter valid text within the field limit.',
    )
  return value.trim()
}
export function applicantProfile(user) {
  const row = getDatabase()
    .prepare('SELECT * FROM applicants WHERE user_id = ?')
    .get(user.id)
  if (!row)
    throw new ApiError(
      404,
      'NOT_FOUND',
      'Applicant profile was not found.',
    )
  return {
    fullName: [row.first_name, row.last_name].filter(Boolean).join(' '),
    email: user.email,
    phone: row.phone || '',
    address: row.address_line_1 || '',
    suburb: row.suburb || '',
    state: row.state || 'NSW',
    postcode: row.postcode || '',
  }
}
export function saveApplicantProfile(user, input) {
  const previous = applicantProfile(user)
  const value = Object.fromEntries(
    ['fullName', 'phone', 'address', 'suburb', 'state', 'postcode'].map(
      (key) => [
        key,
        text(input[key] ?? previous[key], key === 'address' ? 500 : 160),
      ],
    ),
  )
  if (
    value.fullName.length < 2 ||
    !/^\+?[\d\s().-]{7,24}$/.test(value.phone) ||
    value.phone.replace(/\D/g, '').length < 7 ||
    !value.address ||
    !value.suburb ||
    !/^\d{4}$/.test(value.postcode) ||
    !['NSW', 'VIC', 'QLD', 'ACT', 'SA', 'WA', 'TAS', 'NT'].includes(
      value.state,
    )
  )
    throw new ApiError(
      400,
      'VALIDATION',
      'Enter a name, valid phone, complete address, state and four-digit postcode.',
    )
  const [first, ...last] = value.fullName.split(/\s+/)
  withTransaction((db) => {
    db.prepare(
      "UPDATE applicants SET first_name = ?, last_name = ?, phone = ?, address_line_1 = ?, suburb = ?, state = ?, postcode = ?, updated_at = datetime('now') WHERE user_id = ?",
    ).run(
      first,
      last.join(' '),
      value.phone,
      value.address,
      value.suburb,
      value.state,
      value.postcode,
      user.id,
    )
    recordAuditLog({
      actorUserId: user.id,
      action: 'profile.corrected',
      entityType: 'applicant',
      entityId: user.applicantId,
      previousValue: previous,
      newValue: value,
    })
  })
  return { ...value, email: user.email }
}
export function staffDirectory() {
  return getDatabase()
    .prepare(
      "SELECT u.id, u.email, s.full_name AS name, u.role_id AS role FROM users u JOIN staff_profiles s ON s.user_id = u.id WHERE u.account_status = 'active' AND u.role_id IN ('staff', 'admin') ORDER BY s.full_name",
    )
    .all()
}
export function listUsers(filters = {}) {
  const rows = getDatabase()
    .prepare(
      `SELECT u.id, u.email, u.role_id AS role, u.account_status AS status, u.email_verified_at AS verifiedAt, u.last_login_at AS lastLogin,
    COALESCE(s.full_name, trim(a.first_name || ' ' || a.last_name)) AS name
    FROM users u LEFT JOIN applicants a ON a.user_id = u.id LEFT JOIN staff_profiles s ON s.user_id = u.id ORDER BY u.created_at DESC, u.rowid DESC`,
    )
    .all()
  const q = String(filters.q || '').toLowerCase()
  return rows.filter(
    (row) =>
      (!q ||
        [row.name, row.email, row.id].some((value) =>
          value?.toLowerCase().includes(q),
        )) &&
      (!filters.role || row.role === filters.role),
  )
}
export async function saveUser(user, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new ApiError(400, 'VALIDATION', 'Enter valid account details.')
  const changingPassword = !input.id || Object.hasOwn(input, 'password')
  let passwordHash
  if (changingPassword) {
    if (
      typeof input.password !== 'string' ||
      input.password.length < 8 ||
      Buffer.byteLength(input.password, 'utf8') > 72
    )
      throw new ApiError(
        400,
        'VALIDATION',
        'Password must contain at least 8 characters and at most 72 UTF-8 bytes.',
      )
    passwordHash = await hashPassword(input.password)
  }
  return withTransaction((db) => {
    if (!input.id) {
      const email = text(input.email, 254).toLowerCase(),
        name = text(input.name, 160)
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        name.length < 2 ||
        !['staff', 'admin'].includes(input.role)
      )
        throw new ApiError(
          400,
          'VALIDATION',
          'Enter a staff name, email, password and staff/admin role.',
        )
      if (db.prepare('SELECT id FROM users WHERE email = ?').get(email))
        throw new ApiError(
          409,
          'DUPLICATE_ACCOUNT',
          'That email already has an account.',
        )
      const id = randomUUID()
      db.prepare(
        'INSERT INTO users (id, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
      ).run(id, email, passwordHash, input.role)
      db.prepare(
        'INSERT INTO staff_profiles (id, user_id, full_name) VALUES (?, ?, ?)',
      ).run(randomUUID(), id, name)
      recordAuditLog({
        actorUserId: user.id,
        action: 'staff.created',
        entityType: 'user',
        entityId: id,
        newValue: { email, name, role: input.role },
      })
      return id
    }
    const previous = db
      .prepare(
        'SELECT role_id AS role, account_status AS status FROM users WHERE id = ?',
      )
      .get(input.id)
    if (!previous)
      throw new ApiError(404, 'NOT_FOUND', 'Account was not found.')
    const role = input.role || previous.role,
      status = input.status || previous.status
    if (!['active', 'disabled'].includes(status))
      throw new ApiError(
        400,
        'VALIDATION',
        'Choose active or disabled account status.',
      )
    if (input.id === user.id && (role !== previous.role || status !== 'active'))
      throw new ApiError(
        409,
        'SELF_CHANGE',
        'You cannot remove your own administrator access.',
      )
    if (
      ['staff', 'admin'].includes(previous.role)
        ? !['staff', 'admin'].includes(role)
        : role !== previous.role
    )
      throw new ApiError(
        400,
        'VALIDATION',
        'Applicant roles are controlled by the approval workflow.',
      )
    if (
      previous.role === 'admin' &&
      (role !== 'admin' || status !== 'active') &&
      db
        .prepare(
          "SELECT count(*) AS n FROM users WHERE role_id = 'admin' AND account_status = 'active'",
        )
        .get().n <= 1
    )
      throw new ApiError(
        409,
        'LAST_ADMIN',
        'Keep at least one active administrator.',
      )
    db.prepare(
      "UPDATE users SET role_id = ?, account_status = ?, failed_login_count = 0, locked_until = NULL, updated_at = datetime('now') WHERE id = ?",
    ).run(role, status, input.id)
    db.prepare(
      'UPDATE auth_sessions SET revoked = 1 WHERE user_id = ?',
    ).run(input.id)
    if (changingPassword)
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
        passwordHash,
        input.id,
      )
    for (const table of [
      'password_reset_tokens',
      'email_verification_tokens',
    ])
      db.prepare(
        `UPDATE ${table} SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL`,
      ).run(input.id)
    recordAuditLog({
      actorUserId: user.id,
      action: changingPassword
        ? 'account.password_reset'
        : 'account.updated',
      entityType: 'user',
      entityId: input.id,
      previousValue: previous,
      newValue: { role, status },
    })
    return input.id
  })
}
function checkRevision(app, revision) {
  if (app.revision !== revision)
    throw new ApiError(
      409,
      'CONFLICT',
      'This application changed. Refresh and try again.',
    )
}
export function manageApplication(user, id, input) {
  withTransaction((db) => {
    const app = staffApplication(id)
    if (app.status === 'draft')
      throw new ApiError(
        404,
        'NOT_FOUND',
        'Submitted application was not found.',
      )
    checkRevision(app, input.revision)
    const row = db
      .prepare(
        'SELECT a.*, p.user_id FROM foster_applications a JOIN applicants p ON p.id = a.applicant_id WHERE a.id = ?',
      )
      .get(id)
    if (input.action === 'assign_staff') {
      if (
        input.staffId &&
        !staffDirectory().some((staff) => staff.id === input.staffId)
      )
        throw new ApiError(
          400,
          'VALIDATION',
          'Choose an active staff member.',
        )
      db.prepare(
        'UPDATE foster_applications SET assigned_staff_user_id = ? WHERE id = ?',
      ).run(input.staffId || null, id)
    } else if (input.action === 'allow_edit') {
      if (!['pending', 'in_review', 'more_information'].includes(app.status))
        throw new ApiError(
          409,
          'INVALID_TRANSITION',
          'Only applications awaiting a decision can be reopened for correction.',
        )
      db.prepare(
        'INSERT OR REPLACE INTO application_edit_permissions (application_id, granted_by) VALUES (?, ?)',
      ).run(id, user.id)
    } else if (input.action === 'note') {
      const note = text(input.note, 2000)
      if (!note) throw new ApiError(400, 'VALIDATION', 'Enter a note.')
      db.prepare(
        'INSERT INTO application_notes (id, application_id, created_by_user_id, note_text, visible_to_applicant) VALUES (?, ?, ?, ?, ?)',
      ).run(
        randomUUID(),
        id,
        user.id,
        note,
        Number(input.applicantVisible === true),
      )
    } else if (input.action === 'inactive') {
      if (app.status !== 'approved' || app.assignment)
        throw new ApiError(
          409,
          'INVALID_TRANSITION',
          'End the placement before making an approved application inactive.',
        )
      db.prepare(
        "UPDATE foster_applications SET application_status = 'inactive', decided_by_user_id = ?, decision_at = datetime('now') WHERE id = ?",
      ).run(user.id, id)
      const other = db
        .prepare(
          "SELECT 1 FROM foster_applications WHERE applicant_id = ? AND application_status = 'approved' AND id != ?",
        )
        .get(row.applicant_id, id)
      if (!other)
        db.prepare(
          "UPDATE users SET role_id = 'applicant' WHERE id = ?",
        ).run(row.user_id)
    } else
      throw new ApiError(
        400,
        'VALIDATION',
        'Choose a valid application action.',
      )
    db.prepare(
      'UPDATE portal_application_state SET revision = revision + 1 WHERE application_id = ?',
    ).run(id)
    db.prepare(
      "UPDATE foster_applications SET updated_at = datetime('now') WHERE id = ?",
    ).run(id)
    recordAuditLog({
      actorUserId: user.id,
      action: 'application.' + input.action,
      entityType: 'application',
      entityId: id,
      previousValue: { status: app.status, staffId: app.assignedStaffId },
      newValue: {
        status: input.action === 'inactive' ? 'inactive' : app.status,
        label: input.action.replaceAll('_', ' '),
        note: input.note || '',
        staffId: input.staffId || null,
      },
    })
  })
  return staffApplication(id)
}
export function withdrawApplication(user, id) {
  withTransaction((db) => {
    const app = applicantApplication(id, user.applicantId)
    if (!['submitted', 'in_review', 'more_information'].includes(app.status))
      throw new ApiError(
        409,
        'INVALID_TRANSITION',
        'Only applications awaiting a decision can be withdrawn.',
      )
    db.prepare(
      "UPDATE foster_applications SET application_status = 'withdrawn', updated_at = datetime('now') WHERE id = ?",
    ).run(id)
    db.prepare(
      'UPDATE portal_application_state SET revision = revision + 1 WHERE application_id = ?',
    ).run(id)
    db.prepare(
      'DELETE FROM application_edit_permissions WHERE application_id = ?',
    ).run(id)
    applicationEmail(user, id, 'withdrawal')
    recordAuditLog({
      actorUserId: user.id,
      action: 'application.withdrawn',
      entityType: 'application',
      entityId: id,
      previousValue: { status: app.status },
      newValue: {
        status: 'withdrawn',
        note: 'Applicant withdrew the application.',
      },
    })
  })
}
export function updateAllocation(user, id, input) {
  withTransaction((db) => {
    const app = staffApplication(id)
    checkRevision(app, input.revision)
    if (!app.assignment)
      throw new ApiError(
        409,
        'NOT_ASSIGNED',
        'There is no active placement to update.',
      )
    for (const key of ['startDate', 'endDate'])
      if (input[key] && !validDate(input[key]))
        throw new ApiError(
          400,
          'VALIDATION',
          'Enter valid placement dates.',
        )
    if (
      input.endDate &&
      input.startDate &&
      input.endDate < input.startDate
    )
      throw new ApiError(
        400,
        'VALIDATION',
        'End date must follow start date.',
      )
    const note = text(input.note || '', 2000)
    db.prepare(
      "UPDATE greyhound_allocations SET expected_start_date = ?, expected_end_date = ?, internal_notes = ?, updated_at = datetime('now') WHERE id = ?",
    ).run(
      input.startDate || null,
      input.endDate || null,
      note,
      app.assignment.allocationId,
    )
    db.prepare(
      'UPDATE portal_application_state SET revision = revision + 1 WHERE application_id = ?',
    ).run(id)
    recordAuditLog({
      actorUserId: user.id,
      action: 'allocation.updated',
      entityType: 'application',
      entityId: id,
      previousValue: {
        startDate: app.assignment.startDate,
        endDate: app.assignment.endDate,
        note: app.assignment.internalNotes,
      },
      newValue: {
        status: 'approved',
        note,
        startDate: input.startDate || null,
        endDate: input.endDate || null,
        label: 'Placement updated',
      },
    })
  })
  return staffApplication(id)
}
