import { useState } from 'react'
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
import { useEffect } from 'react'
import { apiRequest, saveApiSession, useServerApi } from '../../../../api/http'
import type { ApiSession } from '../../../../api/http'
import { clearStoredSession } from '../authSession'

const INITIAL_VALUES: LoginCredentials = { email: '', password: '' }

interface AuthLocationState {
  from?: { pathname?: string }
  registrationMessage?: string
  verificationUrl?: string
}

export function LoginForm({
  audience,
}: {
  audience?: PortalAudience
}): ReactElement {
  const [values, setValues] = useState(INITIAL_VALUES)
  const [errors, setErrors] = useState<ValidationErrors<LoginCredentials>>({})
  const [requestError, setRequestError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [configuration, setConfiguration] = useState<{
    microsoft: boolean
    demoStaff: boolean
  } | null>(null)
  const [verificationUrl, setVerificationUrl] = useState('')
  const { login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const locationState = location.state as AuthLocationState | null
  useEffect(() => {
    if (!useServerApi) return
    void apiRequest<{ microsoft: boolean; demoStaff: boolean }>(
      '/auth/configuration',
    )
      .then(setConfiguration)
      .catch(() => {})
    const code = new URLSearchParams(window.location.hash.slice(1)).get('sso')
    if (code) {
      window.history.replaceState(null, '', '/staff/login')
      void apiRequest<ApiSession>('/auth/microsoft/exchange', { code })
        .then((session) => {
          saveApiSession(session)
          clearStoredSession()
          window.dispatchEvent(new Event('gap-session-change'))
          navigate('/staff', { replace: true })
        })
        .catch((reason: Error) => setRequestError(reason.message))
    }
  }, [navigate])

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
        'role' in account && ['staff', 'admin'].includes(account.role || '')
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
      {(locationState?.verificationUrl || verificationUrl) && (
        <p>
          <a href={locationState?.verificationUrl || verificationUrl}>
            Open local verification email
          </a>
        </p>
      )}
      {configuration && audience !== 'applicant' && (
        <a
          className="secondary-button"
          href="/api/auth/microsoft/start"
          aria-disabled={!configuration.microsoft}
          onClick={(event) => {
            if (!configuration.microsoft) {
              event.preventDefault()
              setRequestError(
                'Microsoft sign-in is awaiting the client tenant configuration.',
              )
            }
          }}
        >
          Sign in with Microsoft
        </a>
      )}

      {(audience !== 'staff' || !configuration || configuration.demoStaff) && (
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
      )}
      {audience !== 'staff' && (
        <>
          <p>
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
          {requestError.includes('Verify your email') && (
            <button
              className="text-link"
              onClick={() => {
                void apiRequest<{ verificationUrl?: string; message: string }>(
                  '/auth/resend-verification',
                  { email: values.email },
                )
                  .then((result) => {
                    setVerificationUrl(result.verificationUrl || '')
                    setRequestError(result.message)
                  })
                  .catch((reason: Error) => setRequestError(reason.message))
              }}
            >
              Resend verification email
            </button>
          )}
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
