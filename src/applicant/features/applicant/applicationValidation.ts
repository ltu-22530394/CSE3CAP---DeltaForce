import type { ApplicationForm } from './applicationModel'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^\+?[0-9\s().-]+$/

export type ApplicationErrors = Partial<
  Record<keyof ApplicationForm, string | undefined>
>

type StepValidator = (form: ApplicationForm) => ApplicationErrors

function required(value: unknown, message: string): string | undefined {
  return String(value ?? '').trim() ? undefined : message
}

function parseDateOfBirth(value: string): Date | null {
  const trimmedValue = value.trim()
  const dayFirstMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmedValue)
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedValue)

  const year = Number(dayFirstMatch?.[3] ?? isoMatch?.[1])
  const month = Number(dayFirstMatch?.[2] ?? isoMatch?.[2])
  const day = Number(dayFirstMatch?.[1] ?? isoMatch?.[3])

  if (!year || !month || !day) return null

  const parsedDate = new Date(year, month - 1, day)
  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null
  }

  return parsedDate
}

function validatePersonalDetails(form: ApplicationForm): ApplicationErrors {
  const errors: ApplicationErrors = {}

  errors.fullName = required(form.fullName, 'Full name is required.')
  errors.dateOfBirth = required(form.dateOfBirth, 'Date of birth is required.')
  errors.email = required(form.email, 'Email address is required.')
  errors.phone = required(form.phone, 'Phone number is required.')
  errors.address = required(form.address, 'Address is required.')

  if (!errors.dateOfBirth) {
    const dateOfBirth = parseDateOfBirth(form.dateOfBirth)
    if (!dateOfBirth) {
      errors.dateOfBirth = 'Select a valid date.'
    } else if (dateOfBirth > new Date()) {
      errors.dateOfBirth = 'Date of birth cannot be in the future.'
    }
  }
  if (!errors.email && !EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }
  if (!errors.phone) {
    const phone = form.phone.trim()
    const digitCount = phone.replace(/\D/g, '').length
    if (!PHONE_PATTERN.test(phone) || digitCount < 7 || digitCount > 15) {
      errors.phone = 'Enter a valid phone number.'
    }
  }

  return errors
}

function validateHomeEnvironment(form: ApplicationForm): ApplicationErrors {
  const errors: ApplicationErrors = {
    residenceType: required(form.residenceType, 'Select a residence type.'),
    housingStatus: required(
      form.housingStatus,
      'Select whether you own or rent.',
    ),
    adultsInHome: required(form.adultsInHome, 'Enter the number of adults.'),
    childrenInHome: required(
      form.childrenInHome,
      'Enter the number of children.',
    ),
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
    (!Number.isInteger(Number(form.adultsInHome)) ||
      Number(form.adultsInHome) < 1)
  ) {
    errors.adultsInHome = 'Enter a whole number of at least one.'
  }
  if (
    !errors.childrenInHome &&
    (!Number.isInteger(Number(form.childrenInHome)) ||
      Number(form.childrenInHome) < 0)
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
    : { confirmAccurate: 'Please confirm your details before submitting.' }
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

export function validateCompleteApplication(
  form: ApplicationForm,
): ApplicationErrors {
  return STEP_VALIDATORS.reduce(
    (errors, validator) => ({
      ...errors,
      ...removeEmptyErrors(validator(form)),
    }),
    {},
  )
}

export function hasApplicationErrors(errors: ApplicationErrors): boolean {
  return Object.keys(errors).length > 0
}
