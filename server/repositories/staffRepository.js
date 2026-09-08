import { randomUUID } from 'node:crypto'
import { getDatabase, withTransaction } from '../database/db.js'
import { recordAuditLog } from './auditRepository.js'
import { ApiError } from '../utils/apiError.js'

const toUiStatus = { submitted: 'pending', under_review: 'in_review', information_required: 'more_information', approved: 'approved', rejected: 'rejected' }
const toDbStatus = { pending: 'submitted', in_review: 'under_review', more_information: 'information_required', approved: 'approved', rejected: 'rejected' }

const applicationSelect = `
  SELECT fa.*, a.first_name, a.last_name, a.phone, a.date_of_birth,
    a.address_line_1, a.address_line_2, a.suburb, a.state, a.postcode,
    u.email, fd.*
  FROM foster_applications fa
  JOIN applicants a ON a.id = fa.applicant_id
  JOIN users u ON u.id = a.user_id
  LEFT JOIN foster_application_details fd ON fd.application_id = fa.id`

function applicationHistory(db, row) {
  const history = [{ id: `${row.id}-submitted`, at: row.submitted_at || row.created_at, status: 'pending', author: `${row.first_name} ${row.last_name}`, note: 'Application submitted.' }]
  for (const note of db.prepare(`SELECT n.*, COALESCE(s.full_name, u.email) author FROM application_notes n JOIN users u ON u.id=n.created_by_user_id LEFT JOIN staff_profiles s ON s.user_id=u.id WHERE n.application_id=? ORDER BY n.created_at`).all(row.id)) {
    history.push({ id: note.id, at: note.created_at, status: note.note_text.startsWith('[status:') ? note.note_text.slice(8, note.note_text.indexOf(']')) : toUiStatus[row.application_status], author: note.author, note: note.note_text.replace(/^\[status:[^\]]+\]\s*/, '') })
  }
  return history
}

function mapApplication(db, row) {
  if (!row) return null
  const yesNo = (value) => value == null ? 'Not provided' : value ? 'Yes' : 'No'
  return {
    id: row.id,
    status: toUiStatus[row.application_status] || 'pending',
    form: {
      fullName: `${row.first_name} ${row.last_name}`.trim(), dateOfBirth: row.date_of_birth || '', email: row.email,
      phone: row.phone || '', address: [row.address_line_1, row.address_line_2, row.suburb, row.state, row.postcode].filter(Boolean).join(', '),
      residenceType: row.household_type || '', housingStatus: row.housing_status || '', landlordPermission: yesNo(row.landlord_approval),
      adultsInHome: row.adults_in_home == null ? '' : String(row.adults_in_home), childrenInHome: row.children_in_home == null ? '' : String(row.children_in_home),
      secureYard: row.yard_or_outdoor_area || '', applicationType: row.application_type === 'adoption' ? 'Adoption' : 'Foster', dogExperience: row.previous_dog_experience || '',
      greyhoundExperience: row.previous_greyhound_experience || '', hasCurrentPets: row.existing_pets ? 'Yes' : 'No', currentPetsDetails: row.existing_pets || '',
      confirmAccurate: Boolean(row.terms_accepted && row.privacy_consent),
    },
    submittedAt: row.submitted_at || row.created_at, updatedAt: row.updated_at, revision: row.revision,
    history: applicationHistory(db, row),
  }
}

export function listStaffApplications(filters = {}) {
  const db = getDatabase()
  const rows = db.prepare(`${applicationSelect} WHERE fa.application_status NOT IN ('draft','withdrawn','inactive')`).all()
  const query = String(filters.q || '').trim().toLowerCase()
  const wantedStatus = filters.status === 'in_progress' ? new Set(['in_review', 'more_information']) : filters.status ? new Set([filters.status]) : null
  const result = rows.map((row) => mapApplication(db, row)).filter((item) => (!query || [item.id, item.form.fullName, item.form.email, item.form.address].some((v) => v.toLowerCase().includes(query))) && (!wantedStatus || wantedStatus.has(item.status)) && (!filters.type || filters.type === item.form.applicationType))
  return result.sort((a, b) => filters.sort === 'name' ? a.form.fullName.localeCompare(b.form.fullName) : filters.sort === 'oldest' ? a.submittedAt.localeCompare(b.submittedAt) : b.submittedAt.localeCompare(a.submittedAt))
}

export function getStaffApplication(id) {
  const db = getDatabase()
  const item = mapApplication(db, db.prepare(`${applicationSelect} WHERE fa.id=?`).get(id))
  if (!item) throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application could not be found.')
  return item
}

export function decideApplication(id, input, actorUserId, req) {
  const allowed = { approved: ['pending','in_review','more_information'], rejected: ['pending','in_review','more_information'], more_information: ['pending','in_review'], in_review: ['pending','more_information'] }
  const current = getStaffApplication(id)
  if (current.revision !== input.revision) throw new ApiError(409, 'CONFLICT', 'This application has changed. Refresh it before making a decision.')
  if (!allowed[input.decision].includes(current.status)) throw new ApiError(409, 'INVALID_TRANSITION', 'This status change is not available.')
  withTransaction((db) => {
    const result = db.prepare(`UPDATE foster_applications SET application_status=?, assigned_staff_user_id=?, decided_by_user_id=CASE WHEN ? IN ('approved','rejected') THEN ? ELSE decided_by_user_id END, decision_at=CASE WHEN ? IN ('approved','rejected') THEN datetime('now') ELSE decision_at END, rejection_reason=CASE WHEN ?='rejected' THEN ? ELSE rejection_reason END, revision=revision+1, updated_at=datetime('now') WHERE id=? AND revision=?`).run(toDbStatus[input.decision], actorUserId, input.decision, actorUserId, input.decision, input.decision, input.note, id, input.revision)
    if (!result.changes) throw new ApiError(409, 'CONFLICT', 'This application has changed. Refresh it before making a decision.')
    db.prepare(`INSERT INTO application_notes (id, application_id, created_by_user_id, note_text, visible_to_applicant) VALUES (?,?,?,?,?)`).run(randomUUID(), id, actorUserId, `[status:${input.decision}] ${input.note || (input.decision === 'approved' ? 'Application approved.' : 'Review started.')}`, Number(['rejected','more_information','approved'].includes(input.decision)))
  })
  const next = getStaffApplication(id)
  recordAuditLog({ actorUserId, action: 'application.status_changed', entityType: 'foster_application', entityId: id, previousValue: { status: current.status }, newValue: { status: next.status }, req })
  return next
}

export function listAvailableGreyhounds() {
  return getDatabase().prepare(`SELECT id, greyhound_identifier AS identifier, name, sex, age_years AS ageYears, colour, current_location AS currentLocation, availability_status AS status, special_requirements AS specialRequirements FROM greyhounds WHERE availability_status IN ('available','returned') ORDER BY name`).all()
}

export function createAllocation(input, actorUserId, req) {
  const id = randomUUID()
  let allocation
  try {
    withTransaction((db) => {
      const application = db.prepare(`SELECT applicant_id, application_status FROM foster_applications WHERE id=?`).get(input.applicationId)
      if (!application) throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application could not be found.')
      if (application.application_status !== 'approved') throw new ApiError(409, 'APPLICATION_NOT_APPROVED', 'Only an approved application can receive a greyhound allocation.')
      const greyhound = db.prepare(`SELECT availability_status FROM greyhounds WHERE id=?`).get(input.greyhoundId)
      if (!greyhound) throw new ApiError(404, 'GREYHOUND_NOT_FOUND', 'Greyhound could not be found.')
      if (!['available','returned'].includes(greyhound.availability_status)) throw new ApiError(409, 'GREYHOUND_UNAVAILABLE', 'This greyhound is not available for allocation.')
      db.prepare(`INSERT INTO greyhound_allocations (id,foster_carer_applicant_id,greyhound_id,allocated_by_user_id,expected_start_date,expected_end_date,allocation_status,internal_notes) VALUES (?,?,?,?,?,?,?,?)`).run(id, application.applicant_id, input.greyhoundId, actorUserId, input.expectedStartDate, input.expectedEndDate, input.status, input.notes)
      db.prepare(`UPDATE greyhounds SET availability_status=?, updated_at=datetime('now') WHERE id=?`).run(input.status === 'active' ? 'allocated' : 'pending_allocation', input.greyhoundId)
      allocation = db.prepare(`SELECT ga.*, g.name AS greyhound_name, g.greyhound_identifier FROM greyhound_allocations ga JOIN greyhounds g ON g.id=ga.greyhound_id WHERE ga.id=?`).get(id)
    })
  } catch (error) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') throw new ApiError(409, 'GREYHOUND_UNAVAILABLE', 'This greyhound already has an active allocation.')
    throw error
  }
  recordAuditLog({ actorUserId, action: 'greyhound.allocated', entityType: 'greyhound_allocation', entityId: id, newValue: allocation, req })
  return allocation
}

export function listAllocations(applicationId) {
  return getDatabase().prepare(`SELECT ga.*, g.name AS greyhound_name, g.greyhound_identifier FROM greyhound_allocations ga JOIN greyhounds g ON g.id=ga.greyhound_id JOIN foster_applications fa ON fa.applicant_id=ga.foster_carer_applicant_id WHERE (? IS NULL OR fa.id=?) ORDER BY ga.created_at DESC`).all(applicationId || null, applicationId || null)
}
