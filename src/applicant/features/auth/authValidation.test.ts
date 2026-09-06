import { describe, expect, it } from 'vitest'

import {
  hasValidationErrors,
  validateLogin,
  validateRegistration,
} from './authValidation'

describe('validateRegistration', () => {
  it('requires every registration field', () => {
    const errors = validateRegistration({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    })

    expect(errors).toEqual({
      fullName: 'Full name is required.',
      email: 'Email is required.',
      password: 'Password is required.',
      confirmPassword: 'Confirm your password.',
    })
  })

  it('rejects invalid email and mismatched passwords', () => {
    const errors = validateRegistration({
      fullName: 'Taylor Applicant',
      email: 'not-an-email',
      password: 'password-one',
      confirmPassword: 'password-two',
    })

    expect(errors.email).toBe('Enter a valid email address.')
    expect(errors.confirmPassword).toBe('Passwords do not match.')
  })

  it('accepts a valid registration', () => {
    const errors = validateRegistration({
      fullName: 'Taylor Applicant',
      email: 'taylor@example.com',
      password: 'safe-password',
      confirmPassword: 'safe-password',
    })

    expect(hasValidationErrors(errors)).toBe(false)
  })
})

describe('validateLogin', () => {
  it('requires a valid email and password', () => {
    expect(validateLogin({ email: 'invalid', password: '' })).toEqual({
      email: 'Enter a valid email address.',
      password: 'Password is required.',
    })
  })
})
