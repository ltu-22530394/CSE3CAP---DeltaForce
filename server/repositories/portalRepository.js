import { randomUUID } from 'node:crypto'
import { getDatabase, withTransaction } from '../database/db.js'
import { ApiError } from '../utils/apiError.js'
import { recordAuditLog } from './auditRepository.js'
import { findPublicUserById } from './userRepository.js'
import { applicationEmail } from '../integrations/email.js'
import { validDate, localDate } from '../utils/dates.js'
import { config } from '../config.js'
import {
  cleanGreyhound,
  greyhoundColumns,
} from '../utils/greyhoundValidation.js'

const statementCache = new WeakMap()
function prepared(sql) {
  const db = getDatabase()
  let cache = statementCache.get(db)
  if (!cache) {
    cache = new Map()
    statementCache.set(db, cache)
  }
  if (!cache.has(sql)) cache.set(sql, db.prepare(sql))
  return cache.get(sql)
}

const databaseStatus = {
  pending: 'submitted',
  in_review: 'under_review',
  more_information: 'information_required',
  approved: 'approved',
  rejected: 'rejected',
  withdrawn: 'withdrawn',
  inactive: 'inactive',
}
const portalStatus = Object.fromEntries(
  Object.entries(databaseStatus).map(([key, value]) => [value, key]),
)
const activeAllocations = "('proposed', 'confirmed', 'active')"
const formFields = [
  'fullName',
  'dateOfBirth',
  'email',
  'phone',
  'address',
  'suburb',
  'state',
  'postcode',
  'residenceType',
  'housingStatus',
  'landlordPermission',
  'adultsInHome',
  'childrenInHome',
  'secureYard',
  'fenceInformation',
  'yardInformation',
  'householdDetails',
  'preferredGreyhoundCharacteristics',
  'applicationType',
  'dogExperience',
  'greyhoundExperience',
  'hasCurrentPets',
  'currentPetsDetails',
  'preferredFosteringPeriod',
  'availability',
  'transportAvailability',
  'reasonForApplying',
  'emergencyContactName',
  'emergencyContactPhone',
]

export function cleanPortalForm(input, complete = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new ApiError(400, 'VALIDATION', 'Application details are required.')
  const form = Object.fromEntries(
    formFields.map((field) => [
      field,
      typeof input[field] === 'string'
        ? input[field].trim().slice(0, 4000)
        : '',
    ]),
  )
  for (const field of ['confirmAccurate', 'termsAccepted', 'privacyConsent'])
    form[field] = input[field] === true
  if (!complete) return form
  const mandatory = [
    'fullName',
    'dateOfBirth',
    'email',
    'phone',
    'address',
    'suburb',
    'state',
    'postcode',
    'residenceType',
    'housingStatus',
    'adultsInHome',
    'childrenInHome',
    'secureYard',
    'dogExperience',
    'greyhoundExperience',
    'hasCurrentPets',
    'preferredFosteringPeriod',
    'availability',
    'transportAvailability',
    'reasonForApplying',
    'emergencyContactName',
    'emergencyContactPhone',
  ]
  const errors = Object.fromEntries(
    mandatory
      .filter((field) => !form[field])
      .map((field) => [field, 'This field is required.']),
  )
  const choices = {
    residenceType: ['house', 'apartment', 'townhouse', 'other'],
    housingStatus: ['owner', 'renting'],
    secureYard: ['yes', 'no', 'not-applicable'],
    greyhoundExperience: ['yes', 'no'],
    hasCurrentPets: ['yes', 'no'],
    transportAvailability: ['yes', 'no'],
  }
  for (const [field, values] of Object.entries(choices))
    if (!values.includes(form[field])) errors[field] = 'Choose a valid option.'
  if (form.applicationType !== 'foster')
    errors.applicationType = 'This system accepts foster applications.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = 'Enter a valid email.'
  for (const field of ['phone', 'emergencyContactPhone'])
    if (
      !/^\+?[0-9\s().-]{7,24}$/.test(form[field]) ||
      form[field].replace(/\D/g, '').length < 7
    )
      errors[field] = 'Enter a valid phone number.'
  if (!/^\d{4}$/.test(form.postcode))
    errors.postcode = 'Enter a four-digit postcode.'
  if (
    !['NSW', 'VIC', 'QLD', 'ACT', 'SA', 'WA', 'TAS', 'NT'].includes(form.state)
  )
    errors.state = 'Choose an Australian state or territory.'
  const birth = new Date(form.dateOfBirth)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(form.dateOfBirth) ||
    Number.isNaN(birth.getTime()) ||
    birth.toISOString().slice(0, 10) !== form.dateOfBirth ||
    birth > new Date()
  )
    errors.dateOfBirth = 'Enter a valid date of birth.'
  for (const field of ['adultsInHome', 'childrenInHome'])
    if (
      !/^\d+$/.test(form[field]) ||
      Number(form[field]) > 100 ||
      Number(form[field]) < (field === 'adultsInHome' ? 1 : 0)
    )
      errors[field] = 'Enter a valid household count.'
  if (
    form.housingStatus === 'renting' &&
    !['yes', 'no'].includes(form.landlordPermission)
  )
    errors.landlordPermission = 'Confirm landlord permission.'
  if (form.hasCurrentPets === 'yes' && !form.currentPetsDetails)
    errors.currentPetsDetails = 'Describe your current pets.'
  for (const field of ['confirmAccurate', 'termsAccepted', 'privacyConsent'])
    if (!form[field]) errors[field] = 'Consent is required.'
  if (Object.keys(errors).length)
    throw new ApiError(
      400,
      'APPLICATION_INCOMPLETE',
      'Complete the required application details.',
      errors,
    )
  return form
}

function state(id) {
  const row = prepared(
    `SELECT a.*, s.form_json, s.current_step AS portal_step, s.revision, p.user_id FROM foster_applications a
    JOIN portal_application_state s ON s.application_id = a.id JOIN applicants p ON p.id = a.applicant_id WHERE a.id = ?`,
  ).get(id)
  if (!row)
    throw new ApiError(404, 'NOT_FOUND', 'Application could not be found.')
  return row
}

function currentAssignment(applicationId) {
  const row = prepared(
    `SELECT g.*, ga.id AS allocation_id, ga.created_at AS assigned_at, sp.full_name AS assigned_by,
    ga.expected_start_date, ga.expected_end_date, ga.internal_notes, e.feeding_information, e.photo_url FROM greyhound_allocations ga JOIN portal_allocation_applications pa ON pa.allocation_id = ga.id
    JOIN greyhounds g ON g.id = ga.greyhound_id LEFT JOIN staff_profiles sp ON sp.user_id = ga.allocated_by_user_id
    LEFT JOIN greyhound_extra e ON e.greyhound_id = g.id
    WHERE pa.application_id = ? AND ga.allocation_status IN ${activeAllocations}`,
  ).get(applicationId)
  if (!row) return undefined
  return {
    allocationId: row.allocation_id,
    greyhoundId: row.id,
    name: row.name,
    age: row.age_years,
    sex:
      row.sex === 'female' ? 'Female' : row.sex === 'male' ? 'Male' : 'Unknown',
    colour: row.colour,
    careInstructions: row.care_instructions,
    behaviourNotes: row.behaviour_notes,
    medicalNotes: row.medical_notes,
    feedingInformation: row.feeding_information,
    photoUrl: row.photo_url,
    internalNotes: row.internal_notes,
    assignedAt: row.assigned_at + 'Z',
    assignedBy: row.assigned_by,
    startDate: row.expected_start_date,
    endDate: row.expected_end_date,
  }
}

export function staffApplication(id) {
  const row = state(id)
  const form = JSON.parse(row.form_json)
  const choices = {
    yes: 'Yes',
    no: 'No',
    owner: 'Own',
    renting: 'Rent',
    house: 'House',
    apartment: 'Apartment',
    townhouse: 'Townhouse',
    other: 'Other',
    'not-applicable': 'Not applicable',
  }
  for (const field of [
    'residenceType',
    'housingStatus',
    'landlordPermission',
    'secureYard',
    'greyhoundExperience',
    'hasCurrentPets',
  ])
    form[field] = choices[form[field]] || form[field]
  const history = prepared(
    "SELECT * FROM audit_logs WHERE entity_type = 'application' AND entity_id = ? ORDER BY created_at, rowid",
  )
    .all(id)
    .map((event) => {
      const value = JSON.parse(event.new_value_json || '{}')
      const author = event.actor_user_id
        ? findPublicUserById(event.actor_user_id)?.fullName
        : 'System'
      return {
        id: event.id,
        at: event.created_at + 'Z',
        author: author || 'System',
        status: value.status || 'pending',
        note: value.note || '',
        label: value.label,
      }
    })
  return {
    id,
    status: portalStatus[row.application_status] || row.application_status,
    form: { ...form, applicationType: 'Foster' },
    submittedAt: row.submitted_at ? row.submitted_at + 'Z' : null,
    updatedAt: row.updated_at + 'Z',
    revision: row.revision,
    history,
    approvalDate:
      history.findLast((event) => event.status === 'approved')?.at ||
      (row.application_status === 'approved' ? row.decision_at : null),
    assignedStaffId: row.assigned_staff_user_id,
    assignedStaffName: row.assigned_staff_user_id
      ? findPublicUserById(row.assigned_staff_user_id)?.fullName
      : null,
    editable: Boolean(
      prepared(
        'SELECT 1 FROM application_edit_permissions WHERE application_id = ?',
      ).get(id),
    ),
    currentContact: prepared(
      "SELECT trim(first_name || ' ' || last_name) AS fullName, phone, address_line_1 AS address, suburb, state, postcode FROM applicants WHERE id = ?",
    ).get(row.applicant_id),
    assignment: currentAssignment(id),
  }
}

export function applicantApplication(id, applicantId) {
  const row = state(id)
  if (row.applicant_id !== applicantId)
    throw new ApiError(404, 'NOT_FOUND', 'Application could not be found.')
  const note = prepared(
    'SELECT note_text FROM application_notes WHERE application_id = ? AND visible_to_applicant = 1 ORDER BY created_at DESC, rowid DESC LIMIT 1',
  ).get(id)
  const assignment = currentAssignment(id)
  if (assignment) {
    delete assignment.assignedBy
    delete assignment.internalNotes
  }
  return {
    id,
    applicantId,
    status:
      row.application_status === 'submitted'
        ? 'submitted'
        : portalStatus[row.application_status] || row.application_status,
    form: JSON.parse(row.form_json),
    currentStep: row.portal_step,
    createdAt: row.created_at + 'Z',
    updatedAt: row.updated_at + 'Z',
    submittedAt: row.submitted_at ? row.submitted_at + 'Z' : null,
    reviewNote: note?.note_text,
    editable: Boolean(
      prepared(
        'SELECT 1 FROM application_edit_permissions WHERE application_id = ?',
      ).get(id),
    ),
    assignment,
  }
}

export function listApplicantApplications(applicantId) {
  return prepared(
    'SELECT a.id FROM foster_applications a JOIN portal_application_state s ON s.application_id = a.id WHERE a.applicant_id = ? ORDER BY a.updated_at DESC, a.rowid DESC',
  )
    .all(applicantId)
    .map((row) => applicantApplication(row.id, applicantId))
}

export function savePortalApplication(user, input, submit = false) {
  const form = cleanPortalForm(input.form, submit)
  if (submit && form.email.toLowerCase() !== user.email.toLowerCase())
    throw new ApiError(
      400,
      'VALIDATION',
      'Use your account email in the application.',
    )
  const step = input.currentStep ?? 0
  if (!Number.isInteger(step) || step < 0 || step > 3)
    throw new ApiError(400, 'VALIDATION', 'Application step is invalid.')
  const id = input.id || randomUUID()
  let correctionPrevious = null
  withTransaction((db) => {
    if (input.id) {
      const current = state(id)
      if (current.applicant_id !== user.applicantId)
        throw new ApiError(404, 'NOT_FOUND', 'Application could not be found.')
      const permission = db
        .prepare(
          'SELECT 1 FROM application_edit_permissions WHERE application_id = ?',
        )
        .get(id)
      if (current.application_status !== 'draft' && !permission)
        throw new ApiError(
          409,
          'READ_ONLY',
          'Submitted applications are read-only.',
        )
      if (permission && !submit)
        throw new ApiError(
          400,
          'VALIDATION',
          'Submit the complete corrected application.',
        )
      if (permission) correctionPrevious = JSON.parse(current.form_json)
      db.prepare(
        'UPDATE portal_application_state SET form_json = ?, current_step = ?, revision = revision + 1 WHERE application_id = ?',
      ).run(JSON.stringify(form), step, id)
    } else {
      db.prepare(
        'INSERT INTO foster_applications (id, applicant_id) VALUES (?, ?)',
      ).run(id, user.applicantId)
      db.prepare(
        'INSERT INTO portal_application_state (application_id, form_json, current_step) VALUES (?, ?, ?)',
      ).run(id, JSON.stringify(form), step)
    }
    db.prepare(
      "UPDATE foster_applications SET application_status = ?, updated_at = datetime('now'), submitted_at = CASE WHEN ? THEN COALESCE(submitted_at,datetime('now')) ELSE submitted_at END WHERE id = ?",
    ).run(submit ? 'submitted' : 'draft', Number(submit), id)
    if (submit) {
      db.prepare(
        'DELETE FROM application_edit_permissions WHERE application_id = ?',
      ).run(id)
      const [firstName, ...lastName] = form.fullName.split(/\s+/)
      db.prepare(
        "UPDATE applicants SET first_name = ?, last_name = ?, phone = ?, address_line_1 = ?, suburb = ?, state = ?, postcode = ?, date_of_birth = ?, updated_at = datetime('now') WHERE id = ? AND phone IS NULL",
      ).run(
        firstName,
        lastName.join(' '),
        form.phone,
        form.address,
        form.suburb,
        form.state,
        form.postcode,
        form.dateOfBirth,
        user.applicantId,
      )
      recordAuditLog({
        actorUserId: user.id,
        action: 'application.submitted',
        entityType: 'application',
        entityId: id,
        previousValue: correctionPrevious ? { form: correctionPrevious } : null,
        newValue: { status: 'pending', note: 'Application submitted.' },
      })
      applicationEmail(user, id, 'application_confirmation')
    }
  })
  return applicantApplication(id, user.applicantId)
}

export function listStaffApplications(filters = {}) {
  for (const key of ['from', 'to'])
    if (filters[key] && !validDate(filters[key]))
      throw new ApiError(400, 'VALIDATION', 'Use valid filter dates.')
  if (filters.from && filters.to && filters.to < filters.from)
    throw new ApiError(400, 'VALIDATION', 'End date must follow start date.')
  const query = String(filters.q || '')
    .trim()
    .toLowerCase()
  const items = prepared(
    "SELECT a.id FROM foster_applications a JOIN portal_application_state s ON s.application_id = a.id WHERE a.application_status != 'draft'",
  )
    .all()
    .map((row) => staffApplication(row.id))
  return items
    .filter(
      (app) =>
        (!query ||
          [
            app.id,
            app.form.fullName,
            app.form.email,
            app.form.phone,
            app.currentContact?.phone || '',
            app.currentContact?.fullName || '',
            app.form.address,
          ].some((value) => value?.toLowerCase().includes(query))) &&
        (!filters.status ||
          (filters.status === 'in_progress'
            ? ['in_review', 'more_information'].includes(app.status)
            : app.status === filters.status)) &&
        (!filters.type || filters.type === 'Foster') &&
        (!filters.location ||
          (app.currentContact?.suburb || app.form.suburb || '')
            .toLowerCase()
            .includes(String(filters.location).toLowerCase())) &&
        (!filters.staff || app.assignedStaffId === filters.staff) &&
        (!filters.from || app.submittedAt?.slice(0, 10) >= filters.from) &&
        (!filters.to || app.submittedAt?.slice(0, 10) <= filters.to) &&
        (!filters.allocated ||
          (filters.allocated === 'yes'
            ? Boolean(app.assignment)
            : !app.assignment)),
    )
    .sort((a, b) =>
      filters.sort === 'name'
        ? a.form.fullName.localeCompare(b.form.fullName)
        : filters.sort === 'oldest'
          ? (a.submittedAt || '').localeCompare(b.submittedAt || '')
          : (b.submittedAt || '').localeCompare(a.submittedAt || ''),
    )
}

export function decideApplication(user, id, input) {
  const { decision, revision } = input
  const note = String(input.note || '').trim()
  const visible =
    input.applicantVisible === true || decision === 'more_information'
  const allowed = {
    approved: ['submitted', 'under_review', 'information_required'],
    rejected: ['submitted', 'under_review', 'information_required'],
    more_information: ['submitted', 'under_review'],
    in_review: ['submitted', 'information_required'],
  }
  withTransaction((db) => {
    const current = state(id)
    if (current.revision !== revision)
      throw new ApiError(
        409,
        'CONFLICT',
        'The application changed. Refresh before making a decision.',
      )
    if (!allowed[decision]?.includes(current.application_status))
      throw new ApiError(
        409,
        'INVALID_TRANSITION',
        'This decision is no longer available.',
      )
    if (['rejected', 'more_information'].includes(decision) && note.length < 10)
      throw new ApiError(
        400,
        'VALIDATION',
        'Enter a reason of at least 10 characters.',
      )
    if (note.length > 2000)
      throw new ApiError(
        400,
        'VALIDATION',
        'Keep notes within 2,000 characters.',
      )
    if (decision === 'approved')
      cleanPortalForm(JSON.parse(current.form_json), true)
    db.prepare(
      'DELETE FROM application_edit_permissions WHERE application_id = ?',
    ).run(id)
    db.prepare(
      "UPDATE foster_applications SET application_status = ?, assigned_staff_user_id = ?, decided_by_user_id = ?, decision_at = datetime('now'), updated_at = datetime('now'), rejection_reason = ? WHERE id = ?",
    ).run(
      databaseStatus[decision],
      user.id,
      user.id,
      decision === 'rejected' ? note : null,
      id,
    )
    db.prepare(
      'UPDATE portal_application_state SET revision = revision + 1 WHERE application_id = ?',
    ).run(id)
    if (note)
      db.prepare(
        'INSERT INTO application_notes (id, application_id, created_by_user_id, note_text, visible_to_applicant) VALUES (?, ?, ?, ?, ?)',
      ).run(randomUUID(), id, user.id, note, Number(visible))
    if (decision === 'approved')
      db.prepare("UPDATE users SET role_id = 'foster_carer' WHERE id = ?").run(
        current.user_id,
      )
    recordAuditLog({
      actorUserId: user.id,
      action: 'application.' + decision,
      entityType: 'application',
      entityId: id,
      previousValue: { status: current.application_status },
      newValue: { status: decision, note: note || 'Review decision recorded.' },
    })
    if (decision !== 'in_review')
      applicationEmail(
        findPublicUserById(current.user_id),
        id,
        decision === 'approved'
          ? 'approval'
          : decision === 'rejected'
            ? 'rejection'
            : 'information_required',
        visible ? note : '',
      )
  })
  return staffApplication(id)
}

export function listGreyhounds(filters = {}) {
  const rows = prepared(
    `SELECT g.*, e.feeding_information, e.photo_url, EXISTS(SELECT 1 FROM greyhound_allocations a WHERE a.greyhound_id = g.id AND a.allocation_status IN ${activeAllocations}) AS allocated FROM greyhounds g LEFT JOIN greyhound_extra e ON e.greyhound_id = g.id`,
  ).all()
  const items = rows.map((row) => ({
    id: row.id,
    identifier: row.greyhound_identifier,
    salesforceId: row.salesforce_record_id,
    registrationNumber: row.registration_number,
    name: row.name,
    age: row.age_years,
    sex:
      row.sex === 'female' ? 'Female' : row.sex === 'male' ? 'Male' : 'Unknown',
    status: row.allocated ? 'assigned' : row.availability_status,
    dateOfBirth: row.date_of_birth,
    colour: row.colour,
    location: row.current_location,
    careInstructions: row.care_instructions,
    behaviourNotes: row.behaviour_notes,
    medicalNotes: row.medical_notes,
    compatibleWithChildren: row.compatible_with_children,
    compatibleWithCats: row.compatible_with_cats,
    compatibleWithSmallDogs: row.compatible_with_small_dogs,
    compatibleWithOtherAnimals: row.compatible_with_other_animals,
    specialRequirements: row.special_requirements,
    feedingInformation: row.feeding_information,
    photoUrl: row.photo_url,
  }))
  const query = String(filters.q || '').toLowerCase()
  return items
    .filter(
      (item) =>
        (!query ||
          [
            item.name,
            item.identifier,
            item.id,
            item.salesforceId,
            item.registrationNumber,
          ].some((value) => value?.toLowerCase().includes(query))) &&
        (!filters.status ||
          item.status === filters.status ||
          (filters.status === 'medical_hold' &&
            item.status === 'unavailable')) &&
        (!filters.location ||
          item.location
            ?.toLowerCase()
            .includes(String(filters.location).toLowerCase())) &&
        (!filters.colour ||
          item.colour
            ?.toLowerCase()
            .includes(String(filters.colour).toLowerCase())) &&
        (!filters.minAge || item.age >= Number(filters.minAge)) &&
        (!filters.maxAge || item.age <= Number(filters.maxAge)) &&
        (!filters.allocated ||
          (filters.allocated === 'yes'
            ? item.status === 'assigned'
            : item.status !== 'assigned')) &&
        (!filters.compatibility ||
          {
            children: item.compatibleWithChildren,
            cats: item.compatibleWithCats,
            small_dogs: item.compatibleWithSmallDogs,
            other_animals: item.compatibleWithOtherAnimals,
          }[filters.compatibility] === 1),
    )
    .sort((a, b) =>
      filters.sort === 'oldest'
        ? b.age - a.age
        : filters.sort === 'youngest'
          ? a.age - b.age
          : a.name.localeCompare(b.name),
    )
}

export function saveGreyhound(user, input) {
  const id = input.id || randomUUID()
  withTransaction((db) => {
    const previous = input.id
      ? listGreyhounds().find((item) => item.id === id)
      : null
    if (input.id && !previous)
      throw new ApiError(404, 'NOT_FOUND', 'Greyhound could not be found.')
    if (
      previous?.status === 'assigned' &&
      !['assigned', 'allocated'].includes(input.status)
    )
      throw new ApiError(
        409,
        'ASSIGNED',
        'End the active placement before changing availability.',
      )
    const record = cleanGreyhound(
      {
        ...previous,
        ...input,
        identifier:
          input.identifier || previous?.identifier || 'GH-' + id.slice(0, 8),
      },
      { assigned: previous?.status === 'assigned' },
    )
    const collision = db
      .prepare(
        'SELECT id FROM greyhounds WHERE (greyhound_identifier = ? OR salesforce_record_id = ? OR registration_number = ?) AND id != ?',
      )
      .get(
        record.identifier,
        record.salesforceId,
        record.registrationNumber,
        id,
      )
    if (collision)
      throw new ApiError(
        409,
        'DUPLICATE_GREYHOUND',
        'A record already uses that greyhound, Salesforce or registration ID.',
      )
    const columns = Object.values(greyhoundColumns),
      values = Object.keys(greyhoundColumns).map((key) => record[key])
    if (previous)
      db.prepare(
        `UPDATE greyhounds SET ${columns.map((column) => column + ' = ?').join(', ')}, updated_at = datetime('now') WHERE id = ?`,
      ).run(...values, id)
    else
      db.prepare(
        `INSERT INTO greyhounds (id, ${columns.join(', ')}) VALUES (?, ${columns.map(() => '?').join(', ')})`,
      ).run(id, ...values)
    db.prepare(
      'INSERT INTO greyhound_extra (greyhound_id, feeding_information, photo_url) VALUES (?, ?, ?) ON CONFLICT(greyhound_id) DO UPDATE SET feeding_information = excluded.feeding_information, photo_url = excluded.photo_url',
    ).run(id, record.feedingInformation, record.photoUrl)
    recordAuditLog({
      actorUserId: user.id,
      action: 'greyhound.saved',
      entityType: 'greyhound',
      entityId: id,
      previousValue: previous,
      newValue: record,
    })
  })
  return listGreyhounds().find((item) => item.id === id)
}

export function allocateGreyhound(user, applicationId, input) {
  const { greyhoundId, revision } = input
  withTransaction((db) => {
    const current = state(applicationId)
    if (current.revision !== revision)
      throw new ApiError(
        409,
        'CONFLICT',
        'The application changed. Refresh before allocating.',
      )
    if (current.application_status !== 'approved')
      throw new ApiError(
        409,
        'NOT_APPROVED',
        'Only an approved foster carer can receive a greyhound.',
      )
    if (
      currentAssignment(applicationId) ||
      db
        .prepare(
          `SELECT 1 FROM greyhound_allocations WHERE foster_carer_applicant_id = ? AND allocation_status IN ${activeAllocations}`,
        )
        .get(current.applicant_id)
    )
      throw new ApiError(
        409,
        'ALREADY_ASSIGNED',
        'This application already has a greyhound.',
      )
    const dog = listGreyhounds().find((item) => item.id === greyhoundId)
    if (!dog || dog.status !== 'available')
      throw new ApiError(
        409,
        'NOT_AVAILABLE',
        'This greyhound is no longer available.',
      )
    if (findPublicUserById(current.user_id)?.accountStatus !== 'active')
      throw new ApiError(
        409,
        'ACCOUNT_NOT_ACTIVE',
        'The carer account is disabled.',
      )
    for (const field of ['startDate', 'endDate'])
      if (input[field] && !validDate(input[field]))
        throw new ApiError(400, 'VALIDATION', 'Enter valid placement dates.')
    if (
      input.endDate &&
      input.endDate <
        (input.startDate || localDate(new Date(), config.timezone))
    )
      throw new ApiError(
        400,
        'VALIDATION',
        'End date must follow the start date.',
      )
    const id = randomUUID()
    db.prepare(
      "INSERT INTO greyhound_allocations (id, foster_carer_applicant_id, greyhound_id, allocated_by_user_id, allocation_status, expected_start_date, expected_end_date, internal_notes) VALUES (?, ?, ?, ?, 'active', ?, ?, ?)",
    ).run(
      id,
      current.applicant_id,
      greyhoundId,
      user.id,
      input.startDate || localDate(new Date(), config.timezone),
      input.endDate || null,
      String(input.note || '')
        .trim()
        .slice(0, 2000),
    )
    db.prepare(
      "UPDATE greyhounds SET availability_status = 'allocated', updated_at = datetime('now') WHERE id = ?",
    ).run(greyhoundId)
    db.prepare(
      'INSERT INTO portal_allocation_applications (allocation_id, application_id) VALUES (?, ?)',
    ).run(id, applicationId)
    db.prepare(
      'UPDATE portal_application_state SET revision = revision + 1 WHERE application_id = ?',
    ).run(applicationId)
    db.prepare(
      "UPDATE foster_applications SET updated_at = datetime('now') WHERE id = ?",
    ).run(applicationId)
    recordAuditLog({
      actorUserId: user.id,
      action: 'greyhound.allocated',
      entityType: 'application',
      entityId: applicationId,
      newValue: {
        status: 'approved',
        label: 'Greyhound allocated',
        note: dog.name + ' allocated.',
      },
    })
    applicationEmail(
      findPublicUserById(current.user_id),
      applicationId,
      'allocation',
      `${dog.name}, ${dog.age} years, ${dog.sex}. Sign in to see care instructions.`,
      id,
    )
  })
  return staffApplication(applicationId)
}

export function endAllocation(user, applicationId, input) {
  withTransaction((db) => {
    const current = state(applicationId)
    if (current.revision !== input.revision)
      throw new ApiError(
        409,
        'CONFLICT',
        'The application changed. Refresh it first.',
      )
    const assignment = currentAssignment(applicationId)
    if (!assignment)
      throw new ApiError(409, 'NOT_ASSIGNED', 'No active allocation was found.')
    if (!['completed', 'cancelled', 'returned_early'].includes(input.status))
      throw new ApiError(400, 'VALIDATION', 'Choose a valid placement outcome.')
    if (input.returnDate && !validDate(input.returnDate))
      throw new ApiError(400, 'VALIDATION', 'Enter a valid return date.')
    if (
      input.returnDate &&
      (input.returnDate > localDate(new Date(), config.timezone) ||
        input.returnDate < assignment.assignedAt.slice(0, 10))
    )
      throw new ApiError(
        400,
        'VALIDATION',
        'Return date must be between allocation and today.',
      )
    db.prepare(
      "UPDATE greyhound_allocations SET allocation_status = ?, actual_end_date = ?, updated_at = datetime('now') WHERE id = ?",
    ).run(
      input.status,
      input.returnDate || localDate(new Date(), config.timezone),
      assignment.allocationId,
    )
    db.prepare(
      "UPDATE greyhounds SET availability_status = 'available' WHERE id = ?",
    ).run(assignment.greyhoundId)
    db.prepare(
      'UPDATE portal_application_state SET revision = revision + 1 WHERE application_id = ?',
    ).run(applicationId)
    recordAuditLog({
      actorUserId: user.id,
      action: 'greyhound.allocation_ended',
      entityType: 'application',
      entityId: applicationId,
      newValue: {
        status: 'approved',
        label: 'Allocation ended',
        note: `${assignment.name}: ${input.status.replaceAll('_', ' ')}.`,
      },
    })
  })
  return staffApplication(applicationId)
}

export function applicationAllocationHistory(id) {
  return prepared(
    `SELECT ga.id, ga.allocation_status AS status, g.name, ga.expected_start_date AS startDate, ga.expected_end_date AS endDate, ga.actual_end_date AS returnedAt, ga.allocation_date AS allocatedAt, ga.internal_notes AS note, sp.full_name AS staffName
    FROM greyhound_allocations ga JOIN portal_allocation_applications pa ON pa.allocation_id = ga.id JOIN greyhounds g ON g.id = ga.greyhound_id LEFT JOIN staff_profiles sp ON sp.user_id = ga.allocated_by_user_id WHERE pa.application_id = ? ORDER BY ga.created_at DESC, ga.rowid DESC`,
  ).all(id)
}
