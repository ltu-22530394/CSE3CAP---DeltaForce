import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactElement } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { Alert } from '../../../components/Alert'
import { FormField } from '../../../components/FormField'
import { useAuth } from '../AuthContext'
import type {
  LoginCredentials,
  PortalAudience,
  ValidationErrors,
} from '../authTypes'
import { hasValidationErrors, validateLogin } from '../authValidation'
import { apiRequest, saveApiSession } from '../../../../api/http'
import type { ApiSession } from '../../../../api/http'
import { saveStoredSession } from '../authSession'

declare global {
  interface Window {
    google?: { accounts: { id: { initialize(options: object): void; renderButton(element: HTMLElement, options: object): void } } }
  }
}

const INITIAL_VALUES: LoginCredentials = { email: '', password: '' }

interface AuthLocationState {
  from?: { pathname?: string }
  registrationMessage?: string
}

export function LoginForm({
  audience,
}: {
  audience?: PortalAudience
}): ReactElement {
  const [values, setValues] = useState(INITIAL_VALUES)
  const [errors, setErrors] = useState<ValidationErrors<LoginCredentials>>(
    {},
  )
  const [requestError, setRequestError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const googleButton = useRef<HTMLDivElement>(null)
  const { login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const locationState = location.state as AuthLocationState | null

  useEffect(() => {
    let active = true
    apiRequest<{ googleClientId: string | null }>('/auth/configuration')
      .then(({ googleClientId }) => {
        if (!active || !googleClientId) return
        const render = () => {
          if (!active || !window.google || !googleButton.current) return
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async ({ credential }: { credential: string }) => {
              try {
                setSubmitting(true)
                const session = await apiRequest<ApiSession>('/auth/google', { credential, audience })
                saveApiSession(session)
                if (['staff', 'admin'].includes(session.user.role)) window.location.assign('/staff')
                else {
                  saveStoredSession({ token: session.token, user: session.user })
                  window.location.assign('/applicant')
                }
              } catch (error) {
                setRequestError(error instanceof Error ? error.message : 'Google Sign-In failed.')
                setSubmitting(false)
              }
            },
          })
          window.google.accounts.id.renderButton(googleButton.current, { theme: 'outline', size: 'large', width: 320 })
        }
        if (window.google) return render()
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.onload = render
        document.head.appendChild(script)
      })
      .catch(() => {})
    return () => { active = false }
  }, [audience])

  function updateField(event: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    const nextErrors = validateLogin(values)
    setErrors(nextErrors)
    setRequestError('')
    if (hasValidationErrors(nextErrors)) return

    try {
      setSubmitting(true)
      const account = await login({ ...values, audience })
      const requested = locationState?.from?.pathname
      const destination =
        'role' in account &&
        ['staff', 'admin'].includes(account.role || '')
          ? '/staff'
          : requested &&
              (requested === '/applicant' ||
                requested.startsWith('/applications/'))
            ? requested
            : '/applicant'
      navigate(destination, { replace: true })
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : 'Login failed. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-panel" aria-labelledby="login-heading">
      <h1 id="login-heading">
        {audience === 'staff'
          ? 'Staff Login'
          : audience === 'applicant'
            ? 'Applicant Login'
            : 'Login'}
      </h1>
      <p>Welcome back! Please login to your account.</p>

      <Alert tone="success">{locationState?.registrationMessage}</Alert>
      <Alert>{requestError}</Alert>
      <div ref={googleButton} aria-label="Google Sign-In" />
      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="login-email"
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
        <button
          className="primary-button"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Logging in…' : 'Login'}
        </button>
      </form>
      <p>
        <Link to="/forgot-password">Forgot password?</Link>
      </p>
      {audience !== 'staff' && (
        <>
          <p>
            <Link to="/apply">Apply to become a foster carer</Link>
          </p>

          <p className="auth-panel__switch">
            Don&apos;t have an account?{' '}
            <Link to="/register">Create an account</Link>
          </p>
        </>
      )}
      <p className="auth-panel__switch">
        <Link to="/">Back to home</Link>
      </p>
    </section>
  )
}
