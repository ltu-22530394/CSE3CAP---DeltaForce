import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Save } from 'lucide-react'
import { ApplicantPortalShell } from '../applicant/features/applicant/components/ApplicantPortalShell'
import { apiRequest, apiSession, saveApiSession } from '../api/http'
import type { ApplicantProfile } from '../api/management'
import { ErrorState, Loading, useResource } from '../components/AsyncView'
import { saveStoredSession } from '../applicant/features/auth/authSession'

function ProfileForm({ initial }: { initial: ApplicantProfile }) {
  const [form, setForm] = useState(initial),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false)
  return (
    <form
      className="management-form"
      onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true)
        setError('')
        setMessage('')
        try {
          const result = await apiRequest<{ profile: ApplicantProfile }>(
            '/portal/profile',
            form,
          )
          setForm(result.profile)
          const session = apiSession()
          if (session) {
            const updated = {
              ...session,
              user: { ...session.user, fullName: result.profile.fullName },
            }
            saveApiSession(updated)
            saveStoredSession(updated)
            window.dispatchEvent(new Event('gap-session-change'))
          }
          setMessage(
            'Contact information updated. Submitted application answers are unchanged.',
          )
        } catch (reason) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Profile could not be saved.',
          )
        } finally {
          setBusy(false)
        }
      }}
    >
      <label className="field">
        <span>Login email</span>
        <input value={form.email} readOnly type="email" />
      </label>
      {(['fullName', 'phone', 'address', 'suburb', 'postcode'] as const).map(
        (key) => (
          <label className="field" key={key}>
            <span>
              {
                {
                  fullName: 'Full name',
                  phone: 'Phone number',
                  address: 'Residential address',
                  suburb: 'Suburb',
                  postcode: 'Postcode',
                }[key]
              }
            </span>
            <input
              value={form[key]}
              required
              maxLength={key === 'address' ? 500 : 160}
              type={key === 'phone' ? 'tel' : 'text'}
              onChange={(event) =>
                setForm({ ...form, [key]: event.target.value })
              }
            />
          </label>
        ),
      )}
      <label className="field">
        <span>State</span>
        <select
          value={form.state}
          onChange={(event) => setForm({ ...form, state: event.target.value })}
        >
          {['NSW', 'VIC', 'QLD', 'ACT', 'SA', 'WA', 'TAS', 'NT'].map(
            (state) => (
              <option key={state}>{state}</option>
            ),
          )}
        </select>
      </label>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <button className="button primary" disabled={busy}>
        <Save size={16} />
        {busy ? 'Saving...' : 'Save contact details'}
      </button>
    </form>
  )
}
export function ApplicantProfilePage() {
  const load = useCallback(
    () => apiRequest<{ profile: ApplicantProfile }>('/portal/profile'),
    [],
  )
  const { data, error, retry } = useResource(load, 'profile')
  return (
    <ApplicantPortalShell>
      <main className="account-action">
        <Link to="/applicant">My applications</Link>
        <h1>My Profile</h1>
        {error ? (
          <ErrorState error={error} retry={retry} />
        ) : !data ? (
          <Loading />
        ) : (
          <ProfileForm initial={data.profile} />
        )}
      </main>
    </ApplicantPortalShell>
  )
}
