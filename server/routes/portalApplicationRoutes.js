import { getStaffApplication } from '../repositories/staffRepository.js'
import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { requireAuth, requireApplicant } from '../middleware/authMiddleware.js'
import { getDatabase, withTransaction } from '../database/db.js'
import { ApiError } from '../utils/apiError.js'
import { queueApplicationMail } from '../services/mail.js'
const status = {
  draft: 'draft',
  submitted: 'submitted',
  under_review: 'in_review',
  information_required: 'more_information',
  approved: 'approved',
  rejected: 'rejected',
}
function map(row) {
  const note = getDatabase()
    .prepare(
      'SELECT note_text FROM application_notes WHERE application_id=? AND visible_to_applicant=1 ORDER BY created_at DESC,rowid DESC LIMIT 1',
    )
    .get(row.id)
  return {
    id: row.id,
    applicantId: row.applicant_id,
    status: status[row.application_status] || 'submitted',
    currentStep: row.current_step,
    form: row.portal_form_json
      ? JSON.parse(row.portal_form_json)
      : getStaffApplication(row.id, true).form,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submittedAt: row.submitted_at,
    reviewNote: note?.note_text.replace(/^\[status:[^\]]+\]\s*/, ''),
  }
}
function owned(id, user) {
  const row = getDatabase()
    .prepare('SELECT * FROM foster_applications WHERE id=? AND applicant_id=?')
    .get(id, user.applicantId)
  if (!row)
    throw new ApiError(404, 'NOT_FOUND', 'Application could not be found.')
  return row
}
const fields = [
  'fullName',
  'dateOfBirth',
  'email',
  'phone',
  'address',
  'residenceType',
  'housingStatus',
  'landlordPermission',
  'adultsInHome',
  'childrenInHome',
  'secureYard',
  'applicationType',
  'dogExperience',
  'greyhoundExperience',
  'hasCurrentPets',
  'currentPetsDetails',
]
function cleanForm(input, submit, user) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new ApiError(400, 'VALIDATION', 'Application details are required.')
  const form = {}
  for (const field of fields) {
    if (typeof input[field] !== 'string' || input[field].length > 2000)
      throw new ApiError(400, 'VALIDATION', `Invalid ${field}.`)
    form[field] = input[field].trim()
  }
  form.email = user.email
  form.confirmAccurate = input.confirmAccurate === true
  if (submit) {
    const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(form.dateOfBirth)
    if (parts) form.dateOfBirth = `${parts[3]}-${parts[2]}-${parts[1]}`
    const birth = new Date(`${form.dateOfBirth}T00:00:00Z`)
    if (
      Number.isNaN(birth.getTime()) ||
      birth.toISOString().slice(0, 10) !== form.dateOfBirth ||
      birth > new Date()
    )
      throw new ApiError(
        400,
        'VALIDATION',
        'Enter a valid date of birth that is not in the future.',
      )
    if (
      form.fullName.length < 2 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(form.dateOfBirth) ||
      !/^[+\d ()-]{8,20}$/.test(form.phone) ||
      form.address.length < 5 ||
      !/[a-z]/i.test(form.address)
    )
      throw new ApiError(
        400,
        'VALIDATION',
        'Provide a full name, date of birth, valid phone and complete residential address.',
      )
    if (
      !['adoption', 'foster'].includes(form.applicationType.toLowerCase()) ||
      !form.residenceType ||
      !form.housingStatus ||
      !form.secureYard ||
      !form.dogExperience ||
      !form.greyhoundExperience ||
      !form.hasCurrentPets ||
      !form.confirmAccurate
    )
      throw new ApiError(
        400,
        'VALIDATION',
        'Complete all required fields and confirm your information.',
      )
    if (
      !/^\d+$/.test(form.adultsInHome) ||
      Number(form.adultsInHome) < 1 ||
      !/^\d+$/.test(form.childrenInHome)
    )
      throw new ApiError(400, 'VALIDATION', 'Enter valid household counts.')
    for (const [field, allowed] of Object.entries({
      residenceType: ['house', 'apartment', 'townhouse', 'other'],
      housingStatus: ['owner', 'renting'],
      secureYard: ['yes', 'no', 'not-applicable'],
      greyhoundExperience: ['yes', 'no'],
      hasCurrentPets: ['yes', 'no'],
    })) {
      if (!allowed.includes(form[field]))
        throw new ApiError(400, 'VALIDATION', `Choose a valid ${field}.`)
    }
    if (form.housingStatus === 'renting' && !form.landlordPermission)
      throw new ApiError(400, 'VALIDATION', 'Specify landlord permission.')
    if (form.hasCurrentPets === 'yes' && !form.currentPetsDetails)
      throw new ApiError(400, 'VALIDATION', 'Describe your current pets.')
  }
  return form
}
export const portalApplicationRouter = Router()
portalApplicationRouter.use(requireAuth, requireApplicant)
portalApplicationRouter.get('/', (req, res) =>
  res.json({
    applications: getDatabase()
      .prepare(
        'SELECT * FROM foster_applications WHERE applicant_id=? ORDER BY updated_at DESC',
      )
      .all(req.user.applicantId)
      .map(map),
  }),
)
portalApplicationRouter.get('/:id', (req, res) =>
  res.json({ application: map(owned(req.params.id, req.user)) }),
)
portalApplicationRouter.post('/', (req, res) => {
  const submit = req.body.submit === true,
    form = cleanForm(req.body.form, submit, req.user)
  if (
    !Number.isInteger(req.body.currentStep) ||
    req.body.currentStep < 0 ||
    req.body.currentStep > 3
  )
    throw new ApiError(400, 'VALIDATION', 'Invalid form step.')
  const id = req.body.id || randomUUID()
  withTransaction((db) => {
    if (req.body.id && owned(id, req.user).application_status !== 'draft')
      throw new ApiError(
        409,
        'READ_ONLY',
        'Submitted applications are read-only.',
      )
    if (
      submit &&
      db
        .prepare(
          "SELECT 1 FROM foster_applications WHERE applicant_id=? AND id<>? AND portal_form_json=? AND application_status <> 'draft'",
        )
        .get(req.user.applicantId, id, JSON.stringify(form))
    )
      throw new ApiError(
        409,
        'DUPLICATE',
        'This application has already been submitted.',
      )
    if (!req.body.id)
      db.prepare(
        'INSERT INTO foster_applications (id,applicant_id) VALUES (?,?)',
      ).run(id, req.user.applicantId)
    db.prepare(
      "UPDATE foster_applications SET portal_form_json=?,application_type=?,current_step=?,application_status=?,submitted_at=CASE WHEN ? THEN datetime('now') ELSE submitted_at END,updated_at=datetime('now') WHERE id=?",
    ).run(
      JSON.stringify(form),
      form.applicationType.toLowerCase() === 'adoption' ? 'adoption' : 'foster',
      req.body.currentStep,
      submit ? 'submitted' : 'draft',
      Number(submit),
      id,
    )
    if (submit)
      queueApplicationMail(
        id,
        'application_confirmation',
        `submitted:${id}`,
        db,
      )
  })
  res.json({ application: map(owned(id, req.user)) })
})
