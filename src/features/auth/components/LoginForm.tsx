import { useState } from 'react'
import type { ChangeEvent, FormEvent, ReactElement } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { Alert } from '../../../components/Alert'
import { FormField } from '../../../components/FormField'
import { useAuth } from '../AuthContext'
import type { LoginCredentials, ValidationErrors } from '../authTypes'
import { hasValidationErrors, validateLogin } from '../authValidation'

const INITIAL_VALUES: LoginCredentials = { email: '', password: '' }

interface AuthLocationState {
  from?: { pathname?: string }
  registrationMessage?: string
}

export function LoginForm(): ReactElement {
  const [values, setValues] = useState(INITIAL_VALUES)
  const [errors, setErrors] = useState<ValidationErrors<LoginCredentials>>({})
  const [requestError, setRequestError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const locationState = location.state as AuthLocationState | null

  function updateField(event: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const nextErrors = validateLogin(values)
    setErrors(nextErrors)
    setRequestError('')
    if (hasValidationErrors(nextErrors)) return

    try {
      setSubmitting(true)
      await login(values)
      const destination = locationState?.from?.pathname || '/applicant'
      navigate(destination, { replace: true })
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Login failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-panel" aria-labelledby="login-heading">
      <h2 id="login-heading">Login</h2>
      <p>Welcome back! Please login to your account.</p>

      <Alert tone="success">{locationState?.registrationMessage}</Alert>
      <Alert>{requestError}</Alert>

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="login-email"
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
          id="login-password"
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={values.password}
          error={errors.password}
          onChange={updateField}
        />
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Login'}
        </button>
      </form>

      <p className="auth-panel__switch">
        Don&apos;t have an account? <Link to="/register">Create an account</Link>
      </p>
    </section>
  )
}
