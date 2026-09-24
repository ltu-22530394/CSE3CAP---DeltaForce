import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'

export function AccountRecoveryPage() {
  const { pathname } = useLocation()
  const verify = pathname === '/verify-email'
  const reset = pathname === '/reset-password'
  const resend = pathname === '/resend-verification'
  const [token] = useState(() => {
    const value =
      new URLSearchParams(window.location.hash.slice(1)).get('token') || ''
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search,
    )
    return value
  })
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false)
  const title = verify
    ? 'Verify your email'
    : reset
      ? 'Set a new password'
      : resend
        ? 'Resend verification email'
        : 'Forgot your password?'
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (reset && password !== confirm) {
      setError('Passwords must match.')
      return
    }
    setBusy(true)
    try {
      if (!import.meta.env.VITE_API_URL)
        throw new Error('Account recovery requires the connected server.')
      const response = await fetch(
        `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/auth${pathname}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(
            verify ? { token } : reset ? { token, password } : { email },
          ),
        },
      )
      const body = await response.json().catch(() => null)
      if (!response.ok)
        throw new Error(
          body?.error?.message ||
            'Unable to complete the request. Please try again later.',
        )
      setMessage(body.message)
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="applicant-surface">
      <section
        className="auth-panel"
        style={{ maxWidth: 520, margin: '48px auto', padding: 24 }}
      >
        <h1>{title}</h1>
        <p>
          {verify
            ? 'Confirm your email address to activate your account.'
            : reset
              ? 'Choose a password of at least 8 characters.'
              : 'Enter the email address used for your GAP account.'}
        </p>
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        {!done && (
          <form onSubmit={submit}>
            {!(reset || verify) && (
              <label>
                Email
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            )}
            {reset && (
              <>
                <label>
                  New password
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <label>
                  Confirm password
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </label>
              </>
            )}
            {(reset || verify) && !token ? (
              <p role="alert">
                This link is missing its token. Request a new email below.
              </p>
            ) : (
              <button className="primary-button" disabled={busy}>
                {busy
                  ? 'Processing…'
                  : verify
                    ? 'Verify email'
                    : reset
                      ? 'Reset password'
                      : 'Send email'}
              </button>
            )}
          </form>
        )}
        <p>
          <Link to="/login">Back to login</Link>
        </p>
        <p>
          <Link to={verify ? '/resend-verification' : '/forgot-password'}>
            Request a new link
          </Link>
        </p>
      </section>
    </main>
  )
}
