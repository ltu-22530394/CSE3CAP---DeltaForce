import { useState } from 'react'
import type { ChangeEvent, FormEvent, ReactElement } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Alert } from '../../../components/Alert'
import { FormField } from '../../../components/FormField'
import { useAuth } from '../AuthContext'
import type { RegistrationValues, ValidationErrors } from '../authTypes'
import {
  hasValidationErrors,
  validateRegistration,
} from '../authValidation'

const INITIAL_VALUES: RegistrationValues = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

export function RegisterForm(): ReactElement {
  const [values, setValues] = useState(INITIAL_VALUES)
  const [errors, setErrors] = useState<ValidationErrors<RegistrationValues>>({})
  const [requestError, setRequestError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  function updateField(event: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const nextErrors = validateRegistration(values)
    setErrors(nextErrors)
    setRequestError('')
    if (hasValidationErrors(nextErrors)) return

    try {
      setSubmitting(true)
      await register(values)
      navigate('/login', {
        replace: true,
        state: { registrationMessage: 'Registration successful. You can now log in.' },
      })
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : 'Registration failed. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-panel" aria-labelledby="register-heading">
      <h2 id="register-heading">Create Account</h2>
      <p>Fill in your details to create an account.</p>

      <Alert>{requestError}</Alert>

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="register-full-name"
          label="Full Name"
          name="fullName"
          autoComplete="name"
          placeholder="Enter your full name"
          value={values.fullName}
          error={errors.fullName}
          onChange={updateField}
        />
        <FormField
          id="register-email"
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          value={values.email}
          error={errors.email}
          onChange={updateField}
        />
        <FormField
          id="register-password"
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Create a password"
          value={values.password}
          error={errors.password}
          onChange={updateField}
        />
        <FormField
          id="register-confirm-password"
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Confirm your password"
          value={values.confirmPassword}
          error={errors.confirmPassword}
          onChange={updateField}
        />
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Register'}
        </button>
      </form>

      <p className="auth-panel__switch">
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </section>
  )
}
