import { describe, expect, it } from 'vitest'

import { createEmptyApplicationForm } from './applicationModel'
import type { ApplicationForm } from './applicationModel'
import {
  hasApplicationErrors,
  validateApplicationStep,
  validateCompleteApplication,
} from './applicationValidation'

function validForm(): ApplicationForm {
  return {
    ...createEmptyApplicationForm(),
    fullName: 'Taylor Applicant',
    dateOfBirth: '1990-04-12',
    email: 'taylor@example.com',
    phone: '0412 345 678',
    address: '10 Sample Street, Sydney NSW',
    residenceType: 'house',
    housingStatus: 'owner',
    landlordPermission: '',
    adultsInHome: '2',
    childrenInHome: '0',
    secureYard: 'yes',
    applicationType: 'foster',
    dogExperience: 'I have cared for dogs for five years.',
    greyhoundExperience: 'no',
    hasCurrentPets: 'no',
    currentPetsDetails: '',
    confirmAccurate: true,
  }
}

describe('application validation', () => {
  it('requires the personal and contact fields from step one', () => {
    const errors = validateApplicationStep(0, createEmptyApplicationForm())

    expect(errors).toMatchObject({
      fullName: 'Full name is required.',
      dateOfBirth: 'Date of birth is required.',
      email: 'Email address is required.',
      phone: 'Phone number is required.',
      address: 'Address is required.',
    })
  })

  it('requires landlord permission only for a rented home', () => {
    const form = { ...validForm(), housingStatus: 'renting' }
    const errors = validateApplicationStep(1, form)

    expect(errors.landlordPermission).toBe(
      'Confirm whether landlord permission is available.',
    )
  })

  it('requires current-pet details when pets live in the home', () => {
    const form = { ...validForm(), hasCurrentPets: 'yes' }
    const errors = validateApplicationStep(2, form)

    expect(errors.currentPetsDetails).toBe(
      'Describe the pets currently living with you.',
    )
  })

  it('accepts a complete application', () => {
    expect(hasApplicationErrors(validateCompleteApplication(validForm()))).toBe(false)
  })
})
