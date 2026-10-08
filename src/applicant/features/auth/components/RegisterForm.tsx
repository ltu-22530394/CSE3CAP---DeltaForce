import { useState } from 'react'
import type { ChangeEvent, FormEvent, ReactElement } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Alert } from '../../../components/Alert'
import { FormField } from '../../../components/FormField'
import { useAuth } from '../AuthContext'
import type { RegistrationValues, ValidationErrors } from '../authTypes'
import { hasValidationErrors, validateRegistration } from '../authValidation'

const INITIAL_VALUES: RegistrationValues = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  termsAccepted: false,
  privacyConsent: false,
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

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    const nextErrors = validateRegistration(values)
    setErrors(nextErrors)
    setRequestError('')
    if (hasValidationErrors(nextErrors)) return

    try {
      setSubmitting(true)
      const account = await register(values)
      navigate('/applicant/login', {
        replace: true,
        state: {
          registrationMessage:
            'Registration successful. Verify your email address before logging in.',
          verificationUrl: account.verificationUrl,
        },
      })
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : 'Registration failed. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-panel" aria-labelledby="register-heading">
      <h1 id="register-heading">Create Account</h1>
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
          placeholder="name@example.com"
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
        <label className="confirmation-field">
          <input
            type="checkbox"
            required
            checked={Boolean(values.termsAccepted)}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                termsAccepted: event.target.checked,
              }))
            }
          />
          <span>
            I accept the <Link to="/privacy">terms of use</Link>.
          </span>
        </label>
        <label className="confirmation-field">
          <input
            type="checkbox"
            required
            checked={Boolean(values.privacyConsent)}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                privacyConsent: event.target.checked,
              }))
            }
          />
          <span>I consent to the use of my details for my application.</span>
        </label>
        <button
          className="primary-button"
          type="submit"
          disabled={
            submitting || !values.termsAccepted || !values.privacyConsent
          }
        >
          {submitting ? 'Creating account…' : 'Register'}
        </button>
      </form>

      <p className="auth-panel__switch">
        Already have an account? <Link to="/applicant/login">Login here</Link>
      </p>
    </section>
  )
}
