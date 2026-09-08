import { ApiError } from './apiError.js'

const decisions = new Set(['approved', 'rejected', 'more_information', 'in_review'])
const allocationStatuses = new Set(['proposed', 'confirmed', 'active'])

function text(value, field, { required = false, max = 2000 } = {}) {
  const result = typeof value === 'string' ? value.trim() : ''
  if (required && !result) throw new ApiError(400, 'VALIDATION', `${field} is required.`)
  if (result.length > max) throw new ApiError(400, 'VALIDATION', `${field} must be ${max} characters or fewer.`)
  return result || null
}

function date(value, field) {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new ApiError(400, 'VALIDATION', `${field} must be a valid YYYY-MM-DD date.`)
  }
  return value
}

export function validateDecision(body = {}) {
  if (!decisions.has(body.decision)) throw new ApiError(400, 'VALIDATION', 'Select a valid decision.')
  const note = text(body.note, 'Note')
  if (['rejected', 'more_information'].includes(body.decision) && (!note || note.length < 10)) {
    throw new ApiError(400, 'VALIDATION', 'Enter at least 10 characters so the reason is clear.')
  }
  if (!Number.isInteger(body.revision) || body.revision < 0) throw new ApiError(400, 'VALIDATION', 'A valid revision is required.')
  return { decision: body.decision, note, revision: body.revision }
}

export function validateAllocation(body = {}) {
  const applicationId = text(body.applicationId, 'Application', { required: true, max: 100 })
  const greyhoundId = text(body.greyhoundId, 'Greyhound', { required: true, max: 100 })
  const status = body.status || 'proposed'
  if (!allocationStatuses.has(status)) throw new ApiError(400, 'VALIDATION', 'Select a valid allocation status.')
  const startDate = date(body.expectedStartDate, 'Expected start date')
  const endDate = date(body.expectedEndDate, 'Expected end date')
  if (startDate && endDate && endDate < startDate) throw new ApiError(400, 'VALIDATION', 'Expected end date cannot be before the start date.')
  return { applicationId, greyhoundId, status, expectedStartDate: startDate, expectedEndDate: endDate, notes: text(body.notes, 'Notes') }
}
