import { useCallback, useState } from 'react'
import { Save, MessageSquare, Unlock, UserRound } from 'lucide-react'
import { apiRequest } from '../api/http'
import type { Application } from '../api/model'
import type { StaffMember } from '../api/management'
import { useResource } from './AsyncView'

export function StaffApplicationTools({
  application: a,
  changed,
}: {
  application: Application
  changed: () => void
}) {
  const load = useCallback(
    () => apiRequest<{ staff: StaffMember[] }>('/portal/staff/directory'),
    [],
  )
  const { data } = useResource(load, 'directory')
  const [staffId, setStaffId] = useState(a.assignedStaffId || ''),
    [note, setNote] = useState(''),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function manage(action: string) {
    setBusy(true)
    setError('')
    try {
      await apiRequest(`/portal/staff/applications/${a.id}/manage`, {
        action,
        staffId,
        note,
        applicantVisible: visible,
        revision: a.revision,
      })
      setNote('')
      changed()
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Change could not be saved.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="application-tools">
      <h2>Case Management</h2>
      {a.currentContact && (
        <dl className="contact-summary">
          <div>
            <dt>Current contact phone</dt>
            <dd>{a.currentContact.phone || a.form.phone}</dd>
          </div>
          <div>
            <dt>Current contact address</dt>
            <dd>
              {[
                a.currentContact.address,
                a.currentContact.suburb,
                a.currentContact.state,
                a.currentContact.postcode,
              ]
                .filter(Boolean)
                .join(', ') || a.form.address}
            </dd>
          </div>
        </dl>
      )}
      <form
        className="management-inline"
        onSubmit={(event) => {
          event.preventDefault()
          void manage('assign_staff')
        }}
      >
        <label className="field">
          <span>Assigned staff member</span>
          <select
            value={staffId}
            onChange={(event) => setStaffId(event.target.value)}
          >
            <option value="">Unassigned</option>
            {data?.staff.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button secondary" disabled={busy}>
          <UserRound size={16} />
          Assign staff
        </button>
      </form>
      <form
        className="management-form"
        onSubmit={(event) => {
          event.preventDefault()
          void manage('note')
        }}
      >
        <label className="field">
          <span>New case note</span>
          <textarea
            required
            rows={3}
            maxLength={2000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={visible}
            onChange={(event) => setVisible(event.target.checked)}
          />
          Share this note with the applicant
        </label>
        <button className="button secondary" disabled={busy || !note.trim()}>
          <MessageSquare size={16} />
          Add note
        </button>
      </form>
      <div className="dialog-actions">
        {['pending', 'in_review', 'more_information'].includes(a.status) && (
          <button
            className="button secondary"
            disabled={busy || a.editable}
            onClick={() => void manage('allow_edit')}
          >
            <Unlock size={16} />
            {a.editable
              ? 'Corrections permitted'
              : 'Permit application correction'}
          </button>
        )}
        {a.status === 'approved' && !a.assignment && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void manage('inactive')}
          >
            <Save size={16} />
            Make carer inactive
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </section>
  )
}
