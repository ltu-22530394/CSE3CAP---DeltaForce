import { ApiError } from './apiError.js'

const allowedFields = [
  'householdType',
  'housingStatus',
  'landlordApproval',
  'yardOrOutdoorArea',
  'fenceInformation',
  'adultsInHome',
  'childrenInHome',
  'existingPets',
  'previousDogExperience',
  'previousGreyhoundExperience',
  'preferredFosteringPeriod',
  'availability',
  'transportAvailable',
  'preferredGreyhoundCharacteristics',
  'reasonForApplying',
  'emergencyContactName',
  'emergencyContactPhone',
  'termsAccepted',
  'privacyConsent',
  'currentStep',
  'form',
]

export function validateApplicationInput(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(
      400,
      'INVALID_APPLICATION',
      'Application data must be an object.',
    )
  }
  const clean = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) clean[field] = body[field]
  }
  for (const [field, value] of Object.entries(clean)) {
    if (['currentStep', 'form'].includes(field)) continue
    const boolean = [
      'landlordApproval',
      'transportAvailable',
      'termsAccepted',
      'privacyConsent',
    ].includes(field)
    if (
      boolean
        ? typeof value !== 'boolean'
        : !['string', 'number'].includes(typeof value)
    )
      throw new ApiError(400, 'INVALID_APPLICATION', 'Invalid field: ' + field)
    if (typeof value === 'string' && value.length > 4000)
      throw new ApiError(
        400,
        'INVALID_APPLICATION',
        'Field is too long: ' + field,
      )
  }
  if (
    clean.currentStep !== undefined &&
    (!Number.isInteger(clean.currentStep) ||
      clean.currentStep < 1 ||
      clean.currentStep > 5)
  ) {
    throw new ApiError(
      400,
      'INVALID_CURRENT_STEP',
      'Current step must be between 1 and 5.',
    )
  }
  return clean
}

export function validateForSubmission(application) {
  const missing = []
  if (!application.reasonForApplying?.trim()) missing.push('reasonForApplying')
  if (!application.emergencyContactName?.trim())
    missing.push('emergencyContactName')
  if (!application.emergencyContactPhone?.trim())
    missing.push('emergencyContactPhone')
  if (!application.termsAccepted) missing.push('termsAccepted')
  if (!application.privacyConsent) missing.push('privacyConsent')
  if (missing.length) {
    throw new ApiError(
      400,
      'APPLICATION_INCOMPLETE',
      'Complete all required fields before submission.',
      { missing },
    )
  }
}
