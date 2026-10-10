import { useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { apiRequest } from '../api/http'
import { ApplicantPortalShell } from '../applicant/features/applicant/components/ApplicantPortalShell'
import { ErrorState, Loading, useResource } from '../components/AsyncView'
import type { PublicSettings } from '../api/management'

export function AccountActionPage() {
  const { pathname } = useLocation()
  const verify = pathname === '/verify-email'
  const load = useCallback(
    () => apiRequest<{ settings: PublicSettings }>('/portal/public'),
    [],
  )
  const { data } = useResource(load, 'password-help')
  return (
    <ApplicantPortalShell>
      <main className="account-action">
        <h1>{verify ? 'Sign in' : 'Password assistance'}</h1>
        <p>
          {verify
            ? 'Email verification is no longer required. Sign in with your email and password.'
            : 'Contact a GAP administrator for password assistance. Password reset emails are not available.'}
        </p>
        {!verify && data?.settings.contactEmail && (
          <p>
            <a href={`mailto:${data.settings.contactEmail}`}>
              {data.settings.contactEmail}
            </a>
          </p>
        )}
        {!verify && data?.settings.contactPhone && (
          <p>{data.settings.contactPhone}</p>
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
