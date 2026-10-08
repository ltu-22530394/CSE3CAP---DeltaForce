import { ApiError } from './apiError.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MINIMUM_PASSWORD_LENGTH = 8

export function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
}

export function splitFullName(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  }
}

export function validateRegistration(body) {
  const fullName = String(body?.fullName || '').trim()
  const email = normalizeEmail(body?.email)
  const password = String(body?.password || '')
  const errors = {}

  if (!fullName) errors.fullName = 'Full name is required.'
  if (!email) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (!password) {
    errors.password = 'Password is required.'
  } else if (password.length < MINIMUM_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`
  }
  if (Buffer.byteLength(password, 'utf8') > 72)
    errors.password = 'Password must contain at most 72 UTF-8 bytes.'
  if (body?.termsAccepted !== true)
    errors.termsAccepted = 'Terms acceptance is required.'
  if (body?.privacyConsent !== true)
    errors.privacyConsent = 'Privacy consent is required.'

  if (Object.keys(errors).length > 0) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Registration details are invalid.',
      errors,
    )
  }

  return { fullName, email, password, ...splitFullName(fullName) }
}

export function validateLogin(body) {
  const email = normalizeEmail(body?.email)
  const password = String(body?.password || '')
  const audience = body?.audience
  const errors = {}

  if (!email) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (!password) errors.password = 'Password is required.'
  if (audience !== undefined && !['applicant', 'staff'].includes(audience))
    errors.audience = 'Select applicant or staff access.'

  if (Object.keys(errors).length > 0) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Login details are invalid.',
      errors,
    )
  }

  return { email, password, ...(audience === undefined ? {} : { audience }) }
}
