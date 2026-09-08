import { getDatabase, withTransaction } from '../database/db.js'
import { recordAuditLog } from './auditRepository.js'
import { ApiError } from '../utils/apiError.js'

const PUBLIC_STATUSES = new Set([
  'submitted',
  'under_review',
  'information_required',
  'approved',
  'rejected',
  'withdrawn',
  'inactive',
])

const DECISIONABLE_STATUSES = new Set([
  'submitted',
  'under_review',
  'information_required',
])

const APPROVAL_STATUSES = new Set([
  'approved',
  'rejected',
  'decided',
  'pending_decision',
])

const SORTS = {
  newest: "fa.submitted_at DESC, fa.created_at DESC, fa.id DESC",
  oldest: "fa.submitted_at ASC, fa.created_at ASC, fa.id ASC",
  name: "LOWER(a.first_name || ' ' || a.last_name) ASC, fa.submitted_at DESC",
  status: 'fa.application_status ASC, fa.submitted_at DESC',
}

function cleanText(value, maxLength = 120) {
  const text = String(value || '').trim()
  return text ? text.slice(0, maxLength) : ''
}

function parsePositiveInteger(value, fallback, max) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < 1) return fallback
  return Math.min(number, max)
}

function parseOffset(value) {
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 ? number : 0
}

function parseDate(value, field) {
  const text = cleanText(value, 10)
  if (!text) return ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new ApiError(
      400,
      'INVALID_FILTER',
      `${field} must use YYYY-MM-DD format.`,
    )
  }
  return text
}

function mapApplication(row) {
  if (!row) return null

  const applicantName = [row.first_name, row.last_name]
    .filter(Boolean)
    .join(' ')

  return {
    id: row.id,
    applicantId: row.applicant_id,
    applicantName,
    email: row.email,
    phone: row.phone,
    location: {
      addressLine1: row.address_line_1,
      addressLine2: row.address_line_2,
      suburb: row.suburb,
      state: row.state,
      postcode: row.postcode,
    },
    status: row.application_status,
    applicationType: row.application_type,
    currentStep: row.current_step,
    submittedAt: row.submitted_at,
    decisionAt: row.decision_at,
    assignedStaff: row.assigned_staff_user_id
      ? {
          id: row.assigned_staff_user_id,
          name: row.assigned_staff_name,
        }
      : null,
    decidedBy: row.decided_by_user_id
      ? {
          id: row.decided_by_user_id,
          name: row.decided_by_name,
        }
      : null,
    rejectionReason: row.rejection_reason,
    staffNotes: row.staff_notes,
    createdAt: row.application_created_at,
    updatedAt: row.application_updated_at,
    details: {
      householdType: row.household_type,
      housingStatus: row.housing_status,
      landlordApproval: Boolean(row.landlord_approval),
      yardOrOutdoorArea: row.yard_or_outdoor_area,
      fenceInformation: row.fence_information,
      adultsInHome: row.adults_in_home,
      childrenInHome: row.children_in_home,
      existingPets: row.existing_pets,
      previousDogExperience: row.previous_dog_experience,
      previousGreyhoundExperience: row.previous_greyhound_experience,
      preferredFosteringPeriod: row.preferred_fostering_period,
      availability: row.availability,
      transportAvailable: Boolean(row.transport_available),
      preferredGreyhoundCharacteristics:
        row.preferred_greyhound_characteristics,
      reasonForApplying: row.reason_for_applying,
      emergencyContactName: row.emergency_contact_name,
      emergencyContactPhone: row.emergency_contact_phone,
      termsAccepted: Boolean(row.terms_accepted),
      privacyConsent: Boolean(row.privacy_consent),
    },
  }
}

function baseQuery() {
  return `
    FROM foster_applications fa
    INNER JOIN applicants a ON a.id = fa.applicant_id
    INNER JOIN users applicant_user ON applicant_user.id = a.user_id
    LEFT JOIN foster_application_details fd ON fd.application_id = fa.id
    LEFT JOIN staff_profiles assigned_staff
      ON assigned_staff.user_id = fa.assigned_staff_user_id
    LEFT JOIN staff_profiles decided_by_staff
      ON decided_by_staff.user_id = fa.decided_by_user_id
  `
}

function selectColumns() {
  return `
    SELECT
      fa.id,
      fa.applicant_id,
      fa.application_status,
      fa.application_type,
      fa.current_step,
      fa.assigned_staff_user_id,
      fa.submitted_at,
      fa.decision_at,
      fa.decided_by_user_id,
      fa.rejection_reason,
      fa.staff_notes,
      fa.created_at AS application_created_at,
      fa.updated_at AS application_updated_at,
      fd.household_type,
      fd.housing_status,
      fd.landlord_approval,
      fd.yard_or_outdoor_area,
      fd.fence_information,
      fd.adults_in_home,
      fd.children_in_home,
      fd.existing_pets,
      fd.previous_dog_experience,
      fd.previous_greyhound_experience,
      fd.preferred_fostering_period,
      fd.availability,
      fd.transport_available,
      fd.preferred_greyhound_characteristics,
      fd.reason_for_applying,
      fd.emergency_contact_name,
      fd.emergency_contact_phone,
      fd.terms_accepted,
      fd.privacy_consent,
      a.first_name,
      a.last_name,
      a.phone,
      a.address_line_1,
      a.address_line_2,
      a.suburb,
      a.state,
      a.postcode,
      applicant_user.email,
      assigned_staff.full_name AS assigned_staff_name,
      decided_by_staff.full_name AS decided_by_name
  `
}

function buildApplicationFilters(filters = {}) {
  const where = ["fa.application_status <> 'draft'"]
  const params = []
  const search = cleanText(filters.search ?? filters.q, 100).toLowerCase()
  const status = cleanText(filters.status, 40)
  const location = cleanText(filters.location, 100).toLowerCase()
  const assignedStaffUserId = cleanText(filters.assignedStaffUserId, 80)
  const approvalStatus = cleanText(filters.approvalStatus, 40)
  const submittedFrom = parseDate(
    filters.submittedFrom ?? filters.from ?? filters.dateFrom,
    'submittedFrom',
  )
  const submittedTo = parseDate(
    filters.submittedTo ?? filters.to ?? filters.dateTo,
    'submittedTo',
  )

  if (search) {
    where.push(`
      (
        LOWER(fa.id) LIKE ?
        OR LOWER(a.first_name || ' ' || a.last_name) LIKE ?
        OR LOWER(applicant_user.email) LIKE ?
        OR LOWER(COALESCE(a.phone, '')) LIKE ?
      )
    `)
    const term = `%${search}%`
    params.push(term, term, term, term)
  }

  if (status) {
    if (!PUBLIC_STATUSES.has(status)) {
      throw new ApiError(400, 'INVALID_FILTER', 'Application status is invalid.')
    }
    where.push('fa.application_status = ?')
    params.push(status)
  }

  if (submittedFrom) {
    where.push('date(fa.submitted_at) >= date(?)')
    params.push(submittedFrom)
  }

  if (submittedTo) {
    where.push('date(fa.submitted_at) <= date(?)')
    params.push(submittedTo)
  }

  if (location) {
    where.push(`
      (
        LOWER(COALESCE(a.address_line_1, '')) LIKE ?
        OR LOWER(COALESCE(a.address_line_2, '')) LIKE ?
        OR LOWER(COALESCE(a.suburb, '')) LIKE ?
        OR LOWER(COALESCE(a.state, '')) LIKE ?
        OR LOWER(COALESCE(a.postcode, '')) LIKE ?
      )
    `)
    const term = `%${location}%`
    params.push(term, term, term, term, term)
  }

  if (assignedStaffUserId) {
    where.push('fa.assigned_staff_user_id = ?')
    params.push(assignedStaffUserId)
  }

  if (approvalStatus) {
    if (!APPROVAL_STATUSES.has(approvalStatus)) {
      throw new ApiError(400, 'INVALID_FILTER', 'Approval status is invalid.')
    }

    if (approvalStatus === 'decided') {
      where.push('fa.decision_at IS NOT NULL')
    } else if (approvalStatus === 'pending_decision') {
      where.push('fa.decision_at IS NULL')
    } else {
      where.push('fa.application_status = ?')
      params.push(approvalStatus)
    }
  }

  return { where: where.join(' AND '), params }
}

export function listStaffApplications(filters = {}) {
  const db = getDatabase()
  const { where, params } = buildApplicationFilters(filters)
  const sort = SORTS[filters.sort] || SORTS.newest
  const limit = parsePositiveInteger(filters.limit, 50, 100)
  const offset = parseOffset(filters.offset)
  const total = db
    .prepare(`SELECT COUNT(*) AS total ${baseQuery()} WHERE ${where}`)
    .get(...params).total
  const rows = db
    .prepare(
      `
        ${selectColumns()}
        ${baseQuery()}
        WHERE ${where}
        ORDER BY ${sort}
        LIMIT ? OFFSET ?
      `,
    )
    .all(...params, limit, offset)

  return {
    applications: rows.map(mapApplication),
    pagination: {
      total,
      limit,
      offset,
    },
  }
}

export function getStaffApplication(id) {
  const application = mapApplication(
    getDatabase()
      .prepare(
        `
          ${selectColumns()}
          ${baseQuery()}
          WHERE fa.id = ? AND fa.application_status <> 'draft'
        `,
      )
      .get(id),
  )

  if (!application) {
    throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application could not be found.')
  }

  return application
}

function getDecisionCandidate(db, id) {
  return db
    .prepare(
      `
        SELECT
          fa.id,
          fa.applicant_id,
          fa.application_status,
          fa.rejection_reason,
          fa.staff_notes,
          a.user_id AS applicant_user_id
        FROM foster_applications fa
        INNER JOIN applicants a ON a.id = fa.applicant_id
        WHERE fa.id = ?
      `,
    )
    .get(id)
}

function validateDecisionNote(note, { required }) {
  const text = String(note || '').trim()

  if (required && text.length < 10) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Enter at least 10 characters so the reason is clear.',
      { reason: 'A meaningful reason is required.' },
    )
  }

  if (text.length > 2000) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Keep the note within 2,000 characters.',
      { note: 'Maximum length is 2,000 characters.' },
    )
  }

  return text
}

function assertCanDecide(application) {
  if (!application) {
    throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application could not be found.')
  }

  if (application.application_status === 'draft') {
    throw new ApiError(
      409,
      'APPLICATION_NOT_SUBMITTED',
      'Draft applications cannot be approved or rejected.',
    )
  }

  if (application.application_status === 'approved' || application.application_status === 'rejected') {
    throw new ApiError(
      409,
      'DECISION_RECORDED',
      'A final decision has already been recorded for this application.',
    )
  }

  if (!DECISIONABLE_STATUSES.has(application.application_status)) {
    throw new ApiError(
      409,
      'INVALID_APPLICATION_STATUS',
      'This application cannot be approved or rejected from its current status.',
    )
  }
}

function insertDecisionNote(db, { applicationId, staffUserId, note }) {
  if (!note) return

  db.prepare(
    `
      INSERT INTO application_notes (
        application_id,
        created_by_user_id,
        note_text,
        visible_to_applicant
      )
      VALUES (?, ?, ?, 0)
    `,
  ).run(applicationId, staffUserId, note)
}

function recordDecisionAudit(db, { req, staffUserId, application, status, note }) {
  recordAuditLog({
    actorUserId: staffUserId,
    action:
      status === 'approved'
        ? 'application.approved'
        : 'application.rejected',
    entityType: 'foster_application',
    entityId: application.id,
    previousValue: {
      status: application.application_status,
      rejectionReason: application.rejection_reason,
      staffNotes: application.staff_notes,
    },
    newValue: {
      status,
      ...(status === 'rejected' ? { rejectionReason: note } : {}),
    },
    req,
    db,
  })
}

export function approveStaffApplication(id, staffUserId, input = {}, req = null) {
  const note = validateDecisionNote(input.note, { required: false })

  withTransaction((db) => {
    const application = getDecisionCandidate(db, id)
    assertCanDecide(application)

    db.prepare(
      `
        UPDATE foster_applications
        SET application_status = 'approved',
            assigned_staff_user_id = COALESCE(assigned_staff_user_id, ?),
            decided_by_user_id = ?,
            decision_at = datetime('now'),
            rejection_reason = NULL,
            staff_notes = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `,
    ).run(staffUserId, staffUserId, note || null, id)

    db.prepare(
      `
        UPDATE users
        SET role_id = 'foster_carer',
            updated_at = datetime('now')
        WHERE id = ? AND role_id = 'applicant'
      `,
    ).run(application.applicant_user_id)

    insertDecisionNote(db, { applicationId: id, staffUserId, note })
    recordDecisionAudit(db, {
      req,
      staffUserId,
      application,
      status: 'approved',
      note,
    })
  })

  return getStaffApplication(id)
}

export function rejectStaffApplication(id, staffUserId, input = {}, req = null) {
  const reason = validateDecisionNote(input.reason ?? input.note, {
    required: true,
  })

  withTransaction((db) => {
    const application = getDecisionCandidate(db, id)
    assertCanDecide(application)

    db.prepare(
      `
        UPDATE foster_applications
        SET application_status = 'rejected',
            assigned_staff_user_id = COALESCE(assigned_staff_user_id, ?),
            decided_by_user_id = ?,
            decision_at = datetime('now'),
            rejection_reason = ?,
            staff_notes = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `,
    ).run(staffUserId, staffUserId, reason, reason, id)

    insertDecisionNote(db, { applicationId: id, staffUserId, note: reason })
    recordDecisionAudit(db, {
      req,
      staffUserId,
      application,
      status: 'rejected',
      note: reason,
    })
  })

  return getStaffApplication(id)
}
