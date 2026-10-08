import { useCallback, useState } from 'react'
import { Save, CircleStop } from 'lucide-react'
import type { Application } from '../api/model'
import { apiRequest } from '../api/http'
import { useResource, ErrorState } from './AsyncView'
interface PlacementHistory {
  id: string
  name: string
  status: string
  startDate?: string
  endDate?: string
  returnedAt?: string
  allocatedAt: string
  staffName?: string
  note?: string
}
export function PlacementControls({
  application: a,
  changed,
}: {
  application: Application
  changed: () => void
}) {
  const [startDate, setStartDate] = useState(a.assignment?.startDate || ''),
    [endDate, setEndDate] = useState(a.assignment?.endDate || ''),
    [note, setNote] = useState(a.assignment?.internalNotes || ''),
    [status, setStatus] = useState('completed'),
    [returnDate, setReturnDate] = useState(''),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState('')
  const load = useCallback(
    () =>
      apiRequest<{ allocations: PlacementHistory[] }>(
        `/portal/staff/applications/${a.id}/allocations`,
      ),
    [a.id],
  )
  const { data, error, retry } = useResource(load, String(a.revision))
  async function run(action: 'update' | 'end') {
    setBusy(true)
    setFailure('')
    try {
      await apiRequest(
        `/portal/staff/applications/${a.id}/allocation/${action}`,
        { revision: a.revision, startDate, endDate, note, status, returnDate },
      )
      changed()
    } catch (reason) {
      setFailure(
        reason instanceof Error
          ? reason.message
          : 'Placement could not be saved.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="application-tools">
      <h2>Placements</h2>
      {a.assignment && (
        <>
          <form
            className="management-form"
            onSubmit={(event) => {
              event.preventDefault()
              void run('update')
            }}
          >
            <div className="management-grid">
              <label className="field">
                <span>Expected start date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Expected end date</span>
                <input
                  type="date"
                  min={startDate}
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </label>
            </div>
            <label className="field">
              <span>Internal placement notes</span>
              <textarea
                rows={2}
                maxLength={2000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <button disabled={busy} className="button secondary">
              <Save size={16} />
              Update placement
            </button>
          </form>
          <form
            className="management-inline"
            onSubmit={(event) => {
              event.preventDefault()
              void run('end')
            }}
          >
            <label className="field">
              <span>Placement outcome</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="returned_early">Returned early</option>
              </select>
            </label>
            <label className="field">
              <span>Actual return date</span>
              <input
                type="date"
                value={returnDate}
                onChange={(event) => setReturnDate(event.target.value)}
              />
            </label>
            <button disabled={busy} className="button secondary">
              <CircleStop size={16} />
              End placement
            </button>
          </form>
        </>
      )}
      {failure && (
        <p className="field-error" role="alert">
          {failure}
        </p>
      )}
      {error && <ErrorState error={error} retry={retry} />}
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Allocation history"
      >
        <table className="management-table">
          <caption>Allocation history</caption>
          <thead>
            <tr>
              <th>Greyhound</th>
              <th>Status</th>
              <th>Allocated</th>
              <th>Start / end</th>
              <th>Returned</th>
              <th>Staff / notes</th>
            </tr>
          </thead>
          <tbody>
            {data?.allocations.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.name}
                  <small>{item.id}</small>
                </td>
                <td>{item.status.replaceAll('_', ' ')}</td>
                <td>{item.allocatedAt}</td>
                <td>
                  {item.startDate || '-'} / {item.endDate || '-'}
                </td>
                <td>{item.returnedAt || '-'}</td>
                <td>
                  {item.staffName}
                  <small>{item.note}</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data?.allocations.length === 0 && <p>No placements recorded.</p>}
    </section>
  )
}
