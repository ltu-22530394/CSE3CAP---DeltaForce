import { randomUUID } from 'node:crypto'
import { getDatabase, withTransaction } from '../database/db.js'
import { ApiError } from '../utils/apiError.js'

const columns = {
  householdType: 'household_type', housingStatus: 'housing_status', landlordApproval: 'landlord_approval',
  yardOrOutdoorArea: 'yard_or_outdoor_area', fenceInformation: 'fence_information', adultsInHome: 'adults_in_home',
  childrenInHome: 'children_in_home', existingPets: 'existing_pets', previousDogExperience: 'previous_dog_experience',
  previousGreyhoundExperience: 'previous_greyhound_experience', preferredFosteringPeriod: 'preferred_fostering_period',
  availability: 'availability', transportAvailable: 'transport_available', preferredGreyhoundCharacteristics: 'preferred_greyhound_characteristics',
  reasonForApplying: 'reason_for_applying', emergencyContactName: 'emergency_contact_name', emergencyContactPhone: 'emergency_contact_phone',
  termsAccepted: 'terms_accepted', privacyConsent: 'privacy_consent',
}
const booleans = new Set(['landlordApproval', 'transportAvailable', 'termsAccepted', 'privacyConsent'])

function map(row) {
  if (!row) return null
  const result = { id: row.id, status: row.application_status, currentStep: row.current_step, submittedAt: row.submitted_at, createdAt: row.created_at, updatedAt: row.updated_at }
  for (const [key, column] of Object.entries(columns)) result[key] = booleans.has(key) ? Boolean(row[column]) : row[column]
  return result
}

function selectOwned(db, id, applicantId) {
  return db.prepare(`SELECT fa.*, fd.* FROM foster_applications fa LEFT JOIN foster_application_details fd ON fd.application_id = fa.id WHERE fa.id = ? AND fa.applicant_id = ?`).get(id, applicantId)
}

export function listApplications(applicantId) {
  return getDatabase().prepare(`SELECT fa.*, fd.* FROM foster_applications fa LEFT JOIN foster_application_details fd ON fd.application_id = fa.id WHERE fa.applicant_id = ? ORDER BY fa.created_at DESC`).all(applicantId).map(map)
}

export function getApplication(id, applicantId) {
  const value = map(selectOwned(getDatabase(), id, applicantId))
  if (!value) throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application could not be found.')
  return value
}

export function createApplication(applicantId, input) {
  const id = randomUUID()
  withTransaction((db) => {
    db.prepare('INSERT INTO foster_applications (id, applicant_id, current_step) VALUES (?, ?, ?)').run(id, applicantId, input.currentStep || 1)
    db.prepare('INSERT INTO foster_application_details (application_id) VALUES (?)').run(id)
    updateFields(db, id, applicantId, input)
  })
  return getApplication(id, applicantId)
}

function updateFields(db, id, applicantId, input) {
  const current = selectOwned(db, id, applicantId)
  if (!current) throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application could not be found.')
  if (current.application_status !== 'draft') throw new ApiError(409, 'APPLICATION_LOCKED', 'Only draft applications can be changed.')
  if (input.currentStep !== undefined) db.prepare(`UPDATE foster_applications SET current_step = ?, updated_at = datetime('now') WHERE id = ?`).run(input.currentStep, id)
  const entries = Object.entries(input).filter(([key]) => columns[key])
  if (entries.length) {
    const assignments = entries.map(([key]) => `${columns[key]} = ?`).join(', ')
    const values = entries.map(([key, value]) => booleans.has(key) ? Number(Boolean(value)) : value)
    db.prepare(`UPDATE foster_application_details SET ${assignments}, updated_at = datetime('now') WHERE application_id = ?`).run(...values, id)
  }
}

export function updateApplication(id, applicantId, input) {
  withTransaction((db) => updateFields(db, id, applicantId, input))
  return getApplication(id, applicantId)
}

export function deleteApplication(id, applicantId) {
  const application = getApplication(id, applicantId)
  if (application.status !== 'draft') throw new ApiError(409, 'APPLICATION_LOCKED', 'Only draft applications can be deleted.')
  getDatabase().prepare('DELETE FROM foster_applications WHERE id = ? AND applicant_id = ?').run(id, applicantId)
}

export function submitApplication(id, applicantId) {
  const result = getDatabase().prepare(`UPDATE foster_applications SET application_status = 'submitted', submitted_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND applicant_id = ? AND application_status = 'draft'`).run(id, applicantId)
  if (!result.changes) throw new ApiError(409, 'APPLICATION_LOCKED', 'Application is already submitted or unavailable.')
  return getApplication(id, applicantId)
}
