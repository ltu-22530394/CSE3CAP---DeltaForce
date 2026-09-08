import { ApiError } from './apiError.js'

const allowedFields = [
  'householdType', 'housingStatus', 'landlordApproval', 'yardOrOutdoorArea',
  'fenceInformation', 'adultsInHome', 'childrenInHome', 'existingPets',
  'previousDogExperience', 'previousGreyhoundExperience', 'preferredFosteringPeriod',
  'availability', 'transportAvailable', 'preferredGreyhoundCharacteristics',
  'reasonForApplying', 'emergencyContactName', 'emergencyContactPhone',
  'termsAccepted', 'privacyConsent', 'currentStep',
  'applicationType',
]

export function validateApplicationInput(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'INVALID_APPLICATION', 'Application data must be an object.')
  }
  const clean = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) clean[field] = body[field]
  }
  if (clean.currentStep !== undefined && (!Number.isInteger(clean.currentStep) || clean.currentStep < 1 || clean.currentStep > 5)) {
    throw new ApiError(400, 'INVALID_CURRENT_STEP', 'Current step must be between 1 and 5.')
  }
  if (clean.applicationType !== undefined && !['adoption', 'foster'].includes(clean.applicationType)) {
    throw new ApiError(400, 'INVALID_APPLICATION_TYPE', 'Application type must be adoption or foster.')
  }
  return clean
}

export function validateForSubmission(application) {
  const missing = []
  if (!application.reasonForApplying?.trim()) missing.push('reasonForApplying')
  if (!application.emergencyContactName?.trim()) missing.push('emergencyContactName')
  if (!application.emergencyContactPhone?.trim()) missing.push('emergencyContactPhone')
  if (!application.termsAccepted) missing.push('termsAccepted')
  if (!application.privacyConsent) missing.push('privacyConsent')
  if (missing.length) {
    throw new ApiError(400, 'APPLICATION_INCOMPLETE', 'Complete all required fields before submission.', { missing })
  }
}
