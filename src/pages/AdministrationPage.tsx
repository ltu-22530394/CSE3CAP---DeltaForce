import { useCallback, useState } from 'react'
import {
  Save,
  UserPlus,
  Database,
  Send,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { apiRequest, apiSession } from '../api/http'
import type { ManagedUser, PortalSettings } from '../api/management'
import { useResource, ErrorState, Loading } from '../components/AsyncView'

interface Template {
  key: string
  subject: string
  body: string
}
interface Audit {
  id: string
  action: string
  actorId?: string
  actorName?: string
  entityType: string
  entityId?: string
  createdAt: string
  previous?: string
  current?: string
}
interface Maintenance {
  id: string
  kind: string
  status: string
  result?: string
  createdAt: string
}

function SettingsEditor({
  initial,
  users,
  refresh,
}: {
  initial: PortalSettings
  users: ManagedUser[]
  refresh: () => void
}) {
  const [form, setForm] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const labels = {
    contactEmail: 'GAP contact email',
    contactPhone: 'GAP contact phone',
    privacyUrl: 'Privacy policy URL',
    termsUrl: 'Terms of use URL',
    fosteringInformation: 'Public fostering information',
    basicRequirements: 'Basic foster requirements',
    privacyText: 'Privacy notice',
    termsText: 'Terms notice',
  }
  return (
    <form
      className="management-form"
      onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true)
        setError('')
        try {
          await apiRequest('/portal/admin/settings', form)
          refresh()
        } catch (reason) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Settings could not be saved.',
          )
        } finally {
          setBusy(false)
        }
      }}
    >
      {Object.entries(labels).map(([key, label]) => {
        const field = key as keyof typeof labels
        return (
          <label key={key} className="field">
            <span>{label}</span>
            {[
              'contactEmail',
              'contactPhone',
              'privacyUrl',
              'termsUrl',
            ].includes(key) ? (
              <input
                type={
                  key === 'contactEmail'
                    ? 'email'
                    : key.endsWith('Url')
                      ? 'url'
                      : 'text'
                }
                value={form[field]}
                maxLength={1000}
                onChange={(event) =>
                  setForm({ ...form, [key]: event.target.value })
                }
              />
            ) : (
              <textarea
                value={form[field]}
                rows={4}
                maxLength={8000}
                onChange={(event) =>
                  setForm({ ...form, [key]: event.target.value })
                }
              />
            )}
          </label>
        )
      })}
      <fieldset>
        <legend>Weekly report delivery</legend>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={form.weeklyEnabled}
            onChange={(event) =>
              setForm({ ...form, weeklyEnabled: event.target.checked })
            }
          />
          Enable Monday report
        </label>
        <div className="recipient-options">
          {users
            .filter(
              (user) =>
                ['staff', 'admin'].includes(user.role) &&
                user.status === 'active',
            )
            .map((user) => (
              <label className="checkbox-field" key={user.id}>
                <input
                  type="checkbox"
                  checked={form.weeklyRecipients.includes(user.id)}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      weeklyRecipients: event.target.checked
                        ? [...form.weeklyRecipients, user.id]
                        : form.weeklyRecipients.filter((id) => id !== user.id),
                    })
                  }
                />
                {user.name} ({user.email})
              </label>
            ))}
        </div>
      </fieldset>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <button disabled={busy} className="button primary">
        <Save size={16} />
        {busy ? 'Saving...' : 'Save settings'}
      </button>
    </form>
  )
}
function TemplateEditor({
  template,
  refresh,
}: {
  template: Template
  refresh: () => void
}) {
  const [subject, setSubject] = useState(template.subject),
    [body, setBody] = useState(template.body),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  return (
    <form
      className="management-form"
      onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true)
        setError('')
        try {
          await apiRequest(`/portal/admin/templates/${template.key}`, {
            subject,
            body,
          })
          refresh()
        } catch (reason) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Template could not be saved.',
          )
        } finally {
          setBusy(false)
        }
      }}
    >
      <label className="field">
        <span>Subject</span>
        <input
          value={subject}
          required
          maxLength={200}
          onChange={(event) => setSubject(event.target.value)}
        />
      </label>
      <label className="field">
        <span>Email body</span>
        <textarea
          value={body}
          required
          maxLength={10000}
          rows={9}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <button disabled={busy} className="button primary">
        <Save size={16} />
        {busy ? 'Saving...' : 'Save template'}
      </button>
    </form>
  )
}
function Accounts({
  users,
  refresh,
}: {
  users: ManagedUser[]
  refresh: () => void
}) {
  const [q, setQ] = useState(''),
    [page, setPage] = useState(1),
    [creating, setCreating] = useState(false),
    [form, setForm] = useState({
      name: '',
      email: '',
      microsoftId: '',
      role: 'staff',
    }),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const filtered = users.filter((user) =>
      [user.name, user.email, user.id].some((value) =>
        value?.toLowerCase().includes(q.toLowerCase()),
      ),
    ),
    currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 20)))
  async function save(input: object) {
    setBusy(true)
    setError('')
    try {
      await apiRequest('/portal/admin/users', input)
      setCreating(false)
      refresh()
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Account could not be saved.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="management-inline">
        <label className="field">
          <span>Find account</span>
          <input
            type="search"
            value={q}
            onChange={(event) => {
              setQ(event.target.value)
              setPage(1)
            }}
          />
        </label>
        <button
          className="button secondary"
          onClick={() => setCreating(!creating)}
        >
          <UserPlus size={16} />
          {creating ? 'Cancel new staff' : 'Add staff account'}
        </button>
      </div>
      {creating && (
        <form
          className="management-form"
          onSubmit={(event) => {
            event.preventDefault()
            void save(form)
          }}
        >
          {(['name', 'email', 'microsoftId'] as const).map((key) => (
            <label className="field" key={key}>
              <span>
                {
                  {
                    name: 'Staff name',
                    email: 'Staff email',
                    microsoftId: 'Microsoft object ID',
                  }[key]
                }
              </span>
              <input
                type={key === 'email' ? 'email' : 'text'}
                value={form[key]}
                required
                onChange={(event) =>
                  setForm({ ...form, [key]: event.target.value })
                }
              />
            </label>
          ))}
          <label className="field">
            <span>Staff role</span>
            <select
              value={form.role}
              onChange={(event) =>
                setForm({ ...form, role: event.target.value })
              }
            >
              <option value="staff">GAP Staff</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          <button disabled={busy} className="button primary">
            <Save size={16} />
            Create staff account
          </button>
        </form>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Account records"
      >
        <table className="management-table">
          <caption>{filtered.length} accounts</caption>
          <thead>
            <tr>
              <th>Name / email</th>
              <th>Role</th>
              <th>Account status</th>
              <th>Verified / last login</th>
            </tr>
          </thead>
          <tbody>
            {filtered
              .slice((currentPage - 1) * 20, currentPage * 20)
              .map((user) => (
                <tr key={user.id}>
                  <td>
                    {user.name}
                    <small>{user.email}</small>
                    {user.microsoftId && <small>{user.microsoftId}</small>}
                  </td>
                  <td>
                    {['staff', 'admin'].includes(user.role) ? (
                      <select
                        aria-label={`Role for ${user.name}`}
                        disabled={busy || user.id === apiSession()?.user.id}
                        value={user.role}
                        onChange={(event) =>
                          void save({ id: user.id, role: event.target.value })
                        }
                      >
                        <option value="staff">Staff</option>
                        <option value="admin">Administrator</option>
                      </select>
                    ) : (
                      user.role.replaceAll('_', ' ')
                    )}
                  </td>
                  <td>
                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        disabled={busy || user.id === apiSession()?.user.id}
                        checked={user.status === 'active'}
                        onChange={(event) =>
                          void save({
                            id: user.id,
                            status: event.target.checked
                              ? 'active'
                              : 'disabled',
                          })
                        }
                      />
                      Active
                    </label>
                  </td>
                  <td>
                    {user.verifiedAt ? 'Verified' : 'Unverified'}
                    <small>{user.lastLogin || 'No login yet'}</small>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <span>Page {currentPage}</span>
        <div>
          <button
            className="icon-button"
            title="Previous account page"
            aria-label="Previous account page"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-button"
            title="Next account page"
            aria-label="Next account page"
            disabled={currentPage * 20 >= filtered.length}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </>
  )
}
function AuditLog() {
  const [q, setQ] = useState(''),
    [page, setPage] = useState(1)
  const load = useCallback(
    () =>
      apiRequest<{ audit: Audit[]; total: number }>(
        `/portal/admin/audit?${new URLSearchParams({ q, page: String(page) })}`,
      ),
    [q, page],
  )
  const { data, error, retry } = useResource(load, `${q}-${page}`)
  return (
    <>
      <label className="field">
        <span>Search action or record ID</span>
        <input
          type="search"
          value={q}
          onChange={(event) => {
            setQ(event.target.value)
            setPage(1)
          }}
        />
      </label>
      {error ? (
        <ErrorState error={error} retry={retry} />
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Audit records"
          >
            <table className="management-table">
              <caption>{data.total} audit records</caption>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action / record</th>
                  <th>Changes</th>
                </tr>
              </thead>
              <tbody>
                {data.audit.map((item) => (
                  <tr key={item.id}>
                    <td>{item.createdAt} UTC</td>
                    <td>{item.actorName || item.actorId || 'System'}</td>
                    <td>
                      {item.action}
                      <small>
                        {item.entityType}: {item.entityId}
                      </small>
                    </td>
                    <td>
                      <details>
                        <summary>Previous / new values</summary>
                        <pre>{item.previous || '{}'}</pre>
                        <pre>{item.current || '{}'}</pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>Page {page}</span>
            <div>
              <button
                className="icon-button"
                title="Previous audit page"
                aria-label="Previous audit page"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="icon-button"
                title="Next audit page"
                aria-label="Next audit page"
                disabled={page * 50 >= data.total}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
export function AdministrationPage() {
  const [tab, setTab] = useState('accounts'),
    [revision, setRevision] = useState(0),
    [selectedTemplate, setSelectedTemplate] = useState(
      'application_confirmation',
    ),
    [message, setMessage] = useState(''),
    [failure, setFailure] = useState(''),
    [busy, setBusy] = useState(false)
  const refresh = () => {
    setRevision((value) => value + 1)
    setMessage('Changes saved.')
  }
  const load = useCallback(async () => {
    const users = await apiRequest<{ users: ManagedUser[] }>(
        '/portal/admin/users',
      ),
      templates = await apiRequest<{ templates: Template[] }>(
        '/portal/admin/templates',
      ),
      settings = await apiRequest<{ settings: PortalSettings }>(
        '/portal/admin/settings',
      ),
      maintenance = await apiRequest<{ runs: Maintenance[] }>(
        '/portal/admin/maintenance',
      )
    return { ...users, ...templates, ...settings, ...maintenance }
  }, [])
  const { data, error, retry } = useResource(load, String(revision))
  async function maintain(action: 'backup' | 'weekly-report') {
    setBusy(true)
    setFailure('')
    setMessage('')
    try {
      const result = await apiRequest<{ alreadyQueued?: boolean }>(
        `/portal/admin/${action}`,
        {},
      )
      refresh()
      setMessage(
        result.alreadyQueued
          ? 'This weekly report has already been queued today.'
          : action === 'backup'
            ? 'Backup created and integrity verified.'
            : 'Weekly report queued. Check the email outbox for delivery status.',
      )
    } catch (reason) {
      setFailure(
        reason instanceof Error ? reason.message : 'Maintenance failed.',
      )
    } finally {
      setBusy(false)
    }
  }
  if (apiSession()?.user.role !== 'admin')
    return (
      <div className="empty-state">
        <h1>Administrator Access Required</h1>
      </div>
    )
  return (
    <div className="administration-page">
      <header className="management-heading">
        <h1>Administration</h1>
        <button
          className="icon-button"
          title="Refresh administration"
          aria-label="Refresh administration"
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw size={20} />
        </button>
      </header>
      <div
        className="management-tabs"
        role="tablist"
        aria-label="Administration views"
      >
        {[
          ['accounts', 'Accounts'],
          ['templates', 'Email templates'],
          ['settings', 'System settings'],
          ['audit', 'Audit log'],
          ['maintenance', 'Backups & Reports'],
        ].map(([key, label]) => (
          <button
            role="tab"
            aria-selected={tab === key}
            aria-controls={`admin-${key}`}
            id={`admin-tab-${key}`}
            className={tab === key ? 'selected' : ''}
            key={key}
            onClick={() => {
              setTab(key)
              setMessage('')
              setFailure('')
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {message && <p role="status">{message}</p>}
      {failure && (
        <p role="alert" className="field-error">
          {failure}
        </p>
      )}
      {error ? (
        <ErrorState error={error} retry={retry} />
      ) : !data ? (
        <Loading />
      ) : (
        <section
          id={`admin-${tab}`}
          role="tabpanel"
          aria-labelledby={`admin-tab-${tab}`}
        >
          {tab === 'accounts' && (
            <Accounts users={data.users} refresh={refresh} />
          )}
          {tab === 'templates' && (
            <>
              <label className="field">
                <span>Notification template</span>
                <select
                  value={selectedTemplate}
                  onChange={(event) => setSelectedTemplate(event.target.value)}
                >
                  {data.templates.map((template) => (
                    <option key={template.key} value={template.key}>
                      {template.key.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
              {data.templates.find(
                (template) => template.key === selectedTemplate,
              ) && (
                <TemplateEditor
                  key={`${selectedTemplate}-${revision}`}
                  template={data.templates.find(
                    (template) => template.key === selectedTemplate,
                  )!}
                  refresh={refresh}
                />
              )}
            </>
          )}
          {tab === 'settings' && (
            <SettingsEditor
              key={revision}
              initial={data.settings}
              users={data.users}
              refresh={refresh}
            />
          )}
          {tab === 'audit' && <AuditLog />}
          {tab === 'maintenance' && (
            <>
              <div className="dialog-actions">
                <button
                  disabled={busy}
                  className="button secondary"
                  onClick={() => void maintain('backup')}
                >
                  <Database size={16} />
                  {busy ? 'Processing...' : 'Create backup'}
                </button>
                <button
                  disabled={busy || !data.settings.weeklyEnabled}
                  className="button secondary"
                  onClick={() => void maintain('weekly-report')}
                >
                  <Send size={16} />
                  Queue weekly report
                </button>
              </div>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Maintenance history"
              >
                <table className="management-table">
                  <caption>Maintenance history</caption>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Task</th>
                      <th>Status</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.runs.map((run) => (
                      <tr key={run.id}>
                        <td>{run.createdAt} UTC</td>
                        <td>{run.kind.replaceAll('_', ' ')}</td>
                        <td>{run.status}</td>
                        <td>
                          <pre>{run.result}</pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}
