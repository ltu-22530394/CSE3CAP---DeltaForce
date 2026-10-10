import { useCallback, useState } from 'react'
import { Mail, Plug, RefreshCw, Save } from 'lucide-react'
import { apiRequest, apiSession } from '../api/http'
import { useResource, ErrorState, Loading } from '../components/AsyncView'

interface Resource {
  id: string
  title: string
  description: string
  type: string
  url: string
  active: number
  requiresApproval: number
  displayOrder: number
}
interface Notification {
  id: string
  recipient: string
  subject: string
  status: string
}
interface Settings {
  staffAuthentication: 'password'
  email: { mode: string; configured: boolean }
  salesforce: { configured: boolean }
}
export function IntegrationsPage() {
  const [revision, setRevision] = useState(0)
  const [tab, setTab] = useState('emails')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Partial<Resource>>({
    title: '',
    url: '',
    type: 'link',
    description: '',
    active: 1,
    requiresApproval: 1,
    displayOrder: 0,
  })
  const admin = apiSession()?.user.role === 'admin'
  const load = useCallback(async () => {
    const [settings, emails, resources] = await Promise.all([
      apiRequest<Settings>('/portal/staff/integrations'),
      apiRequest<{ notifications: Notification[] }>(
        '/portal/staff/notifications',
      ),
      apiRequest<{ resources: Resource[] }>('/portal/staff/resources'),
    ])
    return { settings, ...emails, ...resources }
  }, [])
  const {
    data,
    error: loadError,
    retry,
  } = useResource(load, String(revision))
  async function saveResource(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await apiRequest('/portal/staff/resources', {
        ...editing,
        active: Boolean(editing.active),
        requiresApproval: Boolean(editing.requiresApproval),
      })
      setEditing({
        title: '',
        url: '',
        type: 'link',
        description: '',
        active: 1,
        requiresApproval: 1,
        displayOrder: 0,
      })
      setRevision((value) => value + 1)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }
  if (loadError) return <ErrorState error={loadError} retry={retry} />
  if (!data) return <Loading label="Loading integrations" />
  return (
    <div className="integrations-page">
      <header className="management-heading">
        <div>
          <h1>Integrations & Resources</h1>
        </div>
        <button
          className="icon-button"
          title="Refresh"
          aria-label="Refresh"
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw size={20} />
        </button>
      </header>
      <section className="integration-status" aria-label="Service connections">
        <div>
          <Plug size={20} />
          <strong>Staff sign-in</strong>
          <span>Email and password</span>
        </div>
        <div>
          <Mail size={20} />
          <strong>Email delivery</strong>
          <span>Disabled</span>
        </div>
        <div>
          <Plug size={20} />
          <strong>Salesforce</strong>
          <span>
            {data.settings.salesforce.configured
              ? 'API configured; CSV available'
              : 'CSV available; API awaiting settings'}
          </span>
        </div>
      </section>
      <div className="integration-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'emails'}
          onClick={() => setTab('emails')}
        >
          Notifications
        </button>
        <button
          role="tab"
          aria-selected={tab === 'resources'}
          onClick={() => setTab('resources')}
        >
          Care resources
        </button>
      </div>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {tab === 'emails' ? (
        <section className="notification-list">
          <h2>Portal notification history</h2>
          {!data.notifications.length && <p>No notifications yet.</p>}
          {data.notifications.map((item) => (
            <article className="notification-row" key={item.id}>
              <div>
                <strong>{item.subject}</strong>
                <span>{item.recipient}</span>
              </div>
              <span>{item.status}</span>
            </article>
          ))}
        </section>
      ) : (
        <section className="resource-management">
          <h2>Care resources</h2>
          {admin && (
            <form
              className="resource-form"
              onSubmit={(event) => void saveResource(event)}
            >
              <label className="field">
                <span>Title</span>
                <input
                  required
                  maxLength={160}
                  value={editing.title}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Type</span>
                <select
                  value={editing.type}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                >
                  {['link', 'youtube', 'vimeo', 'pdf', 'document'].map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="field">
                <span>HTTPS link</span>
                <input
                  type="url"
                  required
                  value={editing.url}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      url: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Description</span>
                <input
                  value={editing.description}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="confirmation-field">
                <input
                  type="checkbox"
                  checked={Boolean(editing.active)}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      active: Number(event.target.checked),
                    }))
                  }
                />
                <span>Active resource</span>
              </label>
              <label className="confirmation-field">
                <input
                  type="checkbox"
                  checked={Boolean(editing.requiresApproval)}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      requiresApproval: Number(event.target.checked),
                    }))
                  }
                />
                <span>Restricted to approved carers</span>
              </label>
              <label className="field">
                <span>Display order</span>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={editing.displayOrder ?? 0}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      displayOrder: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <button className="button primary" disabled={saving}>
                <Save size={16} />
                {saving ? 'Saving...' : 'Save resource'}
              </button>
            </form>
          )}
          {!data.resources.length && (
            <p>No care resources have been added.</p>
          )}
          {data.resources.map((resource) => (
            <article className="resource-row" key={resource.id}>
              <div>
                <a href={resource.url} target="_blank" rel="noreferrer">
                  {resource.title}
                </a>
                <p>{resource.description}</p>
              </div>
              <span>{resource.active ? resource.requiresApproval ? 'Approved carers' : 'Public' : 'Hidden'}</span>
              {admin && (
                <button
                  className="button secondary"
                  onClick={() => setEditing(resource)}
                >
                  Edit
                </button>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
