const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MINIMUM_PASSWORD_LENGTH = 8

function emailError(email: string): string | undefined {
  if (!email.trim()) return 'Email is required.'
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address.'
  return undefined
}

export function validateLogin(
  values: LoginCredentials,
): ValidationErrors<LoginCredentials> {
  const errors: ValidationErrors<LoginCredentials> = {}
  const invalidEmail = emailError(values.email)

  if (invalidEmail) errors.email = invalidEmail
  if (!values.password) errors.password = 'Password is required.'

  return errors
}

export function validateRegistration(
  values: RegistrationValues,
): ValidationErrors<RegistrationValues> {
  const errors: ValidationErrors<RegistrationValues> = {}
  const invalidEmail = emailError(values.email)

  if (!values.fullName.trim()) errors.fullName = 'Full name is required.'
  if (invalidEmail) errors.email = invalidEmail
  if (!values.password) {
    errors.password = 'Password is required.'
  } else if (values.password.length < MINIMUM_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`
  }
  if (!values.confirmPassword) {
    errors.confirmPassword = 'Confirm your password.'
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

export function hasValidationErrors<T>(errors: ValidationErrors<T>): boolean {
  return Object.keys(errors).length > 0
}
import type {
  LoginCredentials,
  RegistrationValues,
  ValidationErrors,
} from './authTypes'

