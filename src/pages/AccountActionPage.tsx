import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { apiRequest } from '../api/http'
import { ApplicantPortalShell } from '../applicant/features/applicant/components/ApplicantPortalShell'
import { ErrorState, Loading, useResource } from '../components/AsyncView'
import type { PublicSettings } from '../api/management'

export function AccountActionPage() {
  const { pathname } = useLocation()
  const verify = pathname === '/verify-email'
  const reset = pathname === '/reset-password'
  const [token] = useState(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token') || ''
    if (window.location.hash)
      window.history.replaceState(null, '', window.location.pathname)
    return value
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [requestError, setRequestError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(
    () => apiRequest<{ settings: PublicSettings }>('/portal/public'),
    [],
  )
  const { data } = useResource(load, 'password-help')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setRequestError('')
    if (reset && password !== confirmPassword) {
      setRequestError('Passwords do not match.')
      return
    }
    try {
      setBusy(true)
      const result = await apiRequest<{ message: string }>(
        reset ? '/auth/reset-password' : '/auth/forgot-password',
        reset ? { token, password } : { email },
      )
      setMessage(result.message)
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : 'The request could not be completed.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <ApplicantPortalShell>
      <main className="account-action">
        <h1>
          {verify ? 'Sign in' : reset ? 'Set a new password' : 'Forgot your password?'}
        </h1>
        <p>
          {verify
            ? 'Email verification is no longer required. Sign in with your email and password.'
            : reset
              ? 'Choose a new password of at least 8 characters.'
              : 'Enter the email address used for your GAP account.'}
        </p>
        {requestError && <p role="alert">{requestError}</p>}
        {message && <p role="status">{message}</p>}
        {!verify && !message && (
          <form onSubmit={handleSubmit}>
            {reset ? (
              token ? (
                <>
                  <label>
                    New password
                    <input
                      required
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </label>
                  <label>
                    Confirm password
                    <input
                      required
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </label>
                </>
              ) : (
                <p role="alert">This reset link is missing its token.</p>
              )
            ) : (
              <label>
                Email
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            )}
            {(!reset || token) && (
              <button className="primary-button" disabled={busy}>
                {busy ? 'Processing…' : reset ? 'Reset password' : 'Send reset instructions'}
              </button>
            )}
          </form>
        )}
        {!verify && data && (data.settings.contactEmail || data.settings.contactPhone) && (
          <p>
            Need more help?{' '}
            {data.settings.contactEmail && (
              <a href={`mailto:${data.settings.contactEmail}`}>{data.settings.contactEmail}</a>
            )}{' '}
            {data.settings.contactPhone}
          </p>
        )}
        <p>
          <Link to="/login">Back to sign in</Link>
        </p>
      </main>
    </ApplicantPortalShell>
  )
}

export function PrivacyPage() {
  const load = useCallback(
    () => apiRequest<{ settings: PublicSettings }>('/portal/public'),
    [],
  )
  const { data, error, retry } = useResource(load, 'privacy')
  return (
    <ApplicantPortalShell>
      <main className="account-action">
        <h1>Privacy and Terms</h1>
        {error ? (
          <ErrorState error={error} retry={retry} />
        ) : !data ? (
          <Loading />
        ) : (
          <>
            <h2>Privacy notice</h2>
            <p style={{ whiteSpace: 'pre-line' }}>
              {data.settings.privacyText}
            </p>
            <h2>Terms of use</h2>
            <p style={{ whiteSpace: 'pre-line' }}>{data.settings.termsText}</p>
            {data.settings.privacyUrl && (
              <p>
                <a
                  href={data.settings.privacyUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  GAP privacy policy
                </a>
              </p>
            )}
            {data.settings.termsUrl && (
              <p>
                <a
                  href={data.settings.termsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  GAP terms of use
                </a>
              </p>
            )}
          </>
        )}
        {data && !data.settings.policyReady && (
          <p role="alert">
            Applications and registration are paused until GAP publishes its
            approved privacy policy and terms of use.
          </p>
        )}
        {data?.settings.policyReady ? (
          <Link to="/apply">Return to application</Link>
        ) : (
          <Link to="/">Return to home</Link>
        )}
      </main>
    </ApplicantPortalShell>
  )
}
