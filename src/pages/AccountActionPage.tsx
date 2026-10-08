import { useCallback, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { apiRequest } from '../api/http'
import { ApplicantPortalShell } from '../applicant/features/applicant/components/ApplicantPortalShell'
import { ErrorState, Loading, useResource } from '../components/AsyncView'
import type { PublicSettings } from '../api/management'

export function AccountActionPage() {
  const { pathname, hash } = useLocation()
  const verify = pathname === '/verify-email'
  const reset = pathname === '/reset-password'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const token = new URLSearchParams(hash.slice(1)).get('token')
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await apiRequest<{
        message: string
        verificationUrl?: string
      }>(
        '/auth/' +
          (verify
            ? 'verify-email'
            : reset
              ? 'reset-password'
              : 'forgot-password'),
        verify ? { token } : reset ? { token, password } : { email },
      )
      setMessage(result.message)
      setPreview(result.verificationUrl || '')
      setDone(true)
      if (verify || reset) window.history.replaceState(null, '', pathname)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The request failed.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <ApplicantPortalShell>
      <main className="account-action">
        <h1>
          {verify
            ? 'Verify email'
            : reset
              ? 'Reset password'
              : 'Forgot password'}
        </h1>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        {!done && (
          <form onSubmit={(event) => void submit(event)}>
            {!verify && (
              <label className="field">
                <span>{reset ? 'New password' : 'Email address'}</span>
                <input
                  required
                  type={reset ? 'password' : 'email'}
                  minLength={reset ? 8 : undefined}
                  maxLength={reset ? 72 : undefined}
                  autoComplete={reset ? 'new-password' : 'email'}
                  value={reset ? password : email}
                  onChange={(event) =>
                    reset
                      ? setPassword(event.target.value)
                      : setEmail(event.target.value)
                  }
                />
              </label>
            )}
            <button
              className="button primary"
              disabled={busy || ((verify || reset) && !token)}
            >
              {busy
                ? 'Processing...'
                : verify
                  ? 'Verify email'
                  : reset
                    ? 'Update password'
                    : 'Request reset link'}
            </button>
          </form>
        )}
        {preview && (
          <p>
            <Link to={preview.replace(window.location.origin, '')}>
              Open local email preview link
            </Link>
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
        {data && (!data.settings.privacyUrl || !data.settings.termsUrl) && (
          <p>
            The client must supply its approved privacy policy, terms, and
            retention policy before this prototype is used with real applicant
            information.
          </p>
        )}
        <Link to="/apply">Return to application</Link>
      </main>
    </ApplicantPortalShell>
  )
}
