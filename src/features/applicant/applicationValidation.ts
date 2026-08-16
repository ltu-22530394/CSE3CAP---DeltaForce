import type { ApplicationForm } from './applicationModel'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+\d][\d\s()-]{7,19}$/

export type ApplicationErrors = Partial<
  Record<keyof ApplicationForm, string | undefined>
>

type StepValidator = (form: ApplicationForm) => ApplicationErrors

function required(value: unknown, message: string): string | undefined {
  return String(value ?? '').trim() ? undefined : message
}

function validatePersonalDetails(form: ApplicationForm): ApplicationErrors {
  const errors: ApplicationErrors = {}

  errors.fullName = required(form.fullName, 'Full name is required.')
  errors.dateOfBirth = required(form.dateOfBirth, 'Date of birth is required.')
  errors.email = required(form.email, 'Email address is required.')
  errors.phone = required(form.phone, 'Phone number is required.')
  errors.address = required(form.address, 'Address is required.')

  if (!errors.dateOfBirth && new Date(form.dateOfBirth) > new Date()) {
    errors.dateOfBirth = 'Date of birth cannot be in the future.'
  }
  if (!errors.email && !EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }
  if (!errors.phone && !PHONE_PATTERN.test(form.phone.trim())) {
    errors.phone = 'Enter a valid phone number.'
  }

  return errors
}

function validateHomeEnvironment(form: ApplicationForm): ApplicationErrors {
  const errors: ApplicationErrors = {
    residenceType: required(form.residenceType, 'Select a residence type.'),
    housingStatus: required(form.housingStatus, 'Select whether you own or rent.'),
    adultsInHome: required(form.adultsInHome, 'Enter the number of adults.'),
    childrenInHome: required(form.childrenInHome, 'Enter the number of children.'),
    secureYard: required(form.secureYard, 'Select a secure-yard option.'),
  }

  if (form.housingStatus === 'renting') {
    errors.landlordPermission = required(
      form.landlordPermission,
      'Confirm whether landlord permission is available.',
    )
  }
  if (
    !errors.adultsInHome &&
    (!Number.isInteger(Number(form.adultsInHome)) || Number(form.adultsInHome) < 1)
  ) {
    errors.adultsInHome = 'Enter a whole number of at least one.'
  }
  if (
    !errors.childrenInHome &&
    (!Number.isInteger(Number(form.childrenInHome)) || Number(form.childrenInHome) < 0)
  ) {
    errors.childrenInHome = 'Enter a whole number of zero or more.'
  }

  return errors
}

function validatePetExperience(form: ApplicationForm): ApplicationErrors {
  const errors: ApplicationErrors = {
    applicationType: required(
      form.applicationType,
      'Select foster or adoption.',
    ),
    dogExperience: required(
      form.dogExperience,
      'Describe your experience caring for dogs.',
    ),
    greyhoundExperience: required(
      form.greyhoundExperience,
      'Select your greyhound experience.',
    ),
    hasCurrentPets: required(
      form.hasCurrentPets,
      'Select whether pets currently live with you.',
    ),
  }

  if (form.hasCurrentPets === 'yes') {
    errors.currentPetsDetails = required(
      form.currentPetsDetails,
      'Describe the pets currently living with you.',
    )
  }

  return errors
}

function validateReview(form: ApplicationForm): ApplicationErrors {
  return form.confirmAccurate
    ? {}
    : { confirmAccurate: 'Confirm that the information is accurate.' }
}

const STEP_VALIDATORS: StepValidator[] = [
  validatePersonalDetails,
  validateHomeEnvironment,
  validatePetExperience,
  validateReview,
]

function removeEmptyErrors(errors: ApplicationErrors): ApplicationErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(([, message]) => Boolean(message)),
  ) as ApplicationErrors
}

export function validateApplicationStep(
  stepIndex: number,
  form: ApplicationForm,
): ApplicationErrors {
  const validator = STEP_VALIDATORS[stepIndex]
  return validator ? removeEmptyErrors(validator(form)) : {}
}

export function validateCompleteApplication(form: ApplicationForm): ApplicationErrors {
  return STEP_VALIDATORS.reduce(
    (errors, validator) => ({ ...errors, ...removeEmptyErrors(validator(form)) }),
    {},
  )
}

export function hasApplicationErrors(errors: ApplicationErrors): boolean {
  return Object.keys(errors).length > 0
}
