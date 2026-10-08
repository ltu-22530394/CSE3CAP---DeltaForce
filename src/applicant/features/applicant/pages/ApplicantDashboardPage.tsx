import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { Alert } from '../../../components/Alert'
import { useAuth } from '../../auth/AuthContext'
import { ApplicantPortalShell } from '../components/ApplicantPortalShell'
import { applicationStatusLabel } from '../applicationModel'
import type { StoredApplication } from '../applicationModel'
import { applicationService } from '../applicationService'
import { apiRequest, useServerApi } from '../../../../api/http'
import { Send, ExternalLink } from 'lucide-react'
import type { PublicSettings } from '../../../../api/management'

interface DashboardLocationState {
  applicationMessage?: string
}

function formatDate(value?: string): string {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function nextStepText(application?: StoredApplication): string {
  if (!application) return 'Create your first foster application.'
  if (application.status === 'withdrawn') return 'You have withdrawn this application.'
  if (application.status === 'inactive') return 'Your foster carer application is inactive. Contact GAP to discuss returning.'
  if (application.editable) return 'GAP has permitted corrections. Review and resubmit your application.'
  if (application.status === 'approved')
    return 'Your application has been approved. The GAP team will advise you on the next steps.'
  if (application.status === 'rejected')
    return application.reviewNote || 'The GAP team has completed its review.'
  if (application.status === 'more_information')
    return (
      application.reviewNote ||
      'The GAP team needs more information. Please contact the team.'
    )
  if (application.status !== 'draft') {
    return 'Your application is with the GAP team for review.'
  }
  return 'Continue the form and submit it when your details are complete.'
}

export function ApplicantDashboardPage(): ReactElement | null {
  const { user } = useAuth()
  const location = useLocation()
  const locationState = location.state as DashboardLocationState | null
  const [applications, setApplications] = useState<StoredApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [resources, setResources] = useState<
    { id: string; title: string; description: string; url: string }[]
  >([])
  const [reply, setReply] = useState('')
  const [replying, setReplying] = useState(false)
  const [settings,setSettings] = useState<PublicSettings | null>(null)
  useEffect(() => { void apiRequest<{settings:PublicSettings}>('/portal/public').then(result=>setSettings(result.settings)).catch(()=>{}) }, [])
  useEffect(() => {
    const refresh = (event: StorageEvent) => {
      if (event.key === 'gap.staff.records.v1')
        setRevision((value) => value + 1)
    }
    window.addEventListener('storage', refresh)
    const update = () => setRevision((value) => value + 1)
    window.addEventListener('focus', update)
    const timer = useServerApi
      ? window.setInterval(() => {
          if (!document.hidden) update()
        }, 15000)
      : undefined
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', update)
      window.clearInterval(timer)
    }
  }, [])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return undefined
    let isActive = true

    applicationService
      .list(user.id)
      .then((items) => {
        if (isActive) setApplications(items)
        if (useServerApi && items.some((item) => item.status === 'approved'))
          void apiRequest<{
            resources: {
              id: string
              title: string
              description: string
              url: string
            }[]
          }>('/portal/resources')
            .then((result) => {
              if (isActive) setResources(result.resources)
            })
            .catch(() => {})
      })
      .catch(() => {
        if (isActive)
          setError('Applications could not be loaded. Please try again.')
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [user, revision])

  if (!user) return null

  const latestApplication = applications[0]
  const previousApplications = applications.slice(1)
  const applicationPath = latestApplication
    ? `/applications/${latestApplication.id}`
    : '/applications/new'
  const applicationAction =
    latestApplication?.status !== 'draft' && !latestApplication?.editable
      ? 'View Application'
      : 'Edit Application'
  const allocation = applications.find((item) => item.assignment)?.assignment
  const informationRequired = applications.find(
    (item) => item.status === 'more_information',
  )
  async function sendReply(event: React.FormEvent) {
    event.preventDefault()
    if (!informationRequired) return
    setReplying(true)
    setError('')
    try {
      await apiRequest(
        `/portal/applications/${informationRequired.id}/information`,
        { text: reply },
      )
      setReply('')
      setRevision((value) => value + 1)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Your reply could not be sent.',
      )
    } finally {
      setReplying(false)
    }
  }
  async function withdraw(id:string) {
    if (!window.confirm('Withdraw this foster application?')) return
    setReplying(true);setError('')
    try { await apiRequest(`/portal/applications/${id}/withdraw`,{});setRevision(value=>value+1) }
    catch(reason){setError(reason instanceof Error?reason.message:'The application could not be withdrawn.')}
    finally{setReplying(false)}
  }

  return (
    <ApplicantPortalShell>
      <main className="dashboard-page">
        {locationState?.applicationMessage && (
          <Alert tone="success">{locationState.applicationMessage}</Alert>
        )}
        {error && <Alert>{error}</Alert>}

        <header className="applicant-page-header">
          <div>
            <p className="eyebrow">
              Welcome back, {user.fullName.split(' ')[0]}
            </p>
            <h1>My Applications</h1>
            <p>Track your application and see what you need to do next.</p>
          </div>
          <Link className="primary-button" to="/applications/new">
            New Application
          </Link>
        </header>

        <div className="applicant-dashboard-grid">
          <div className="applicant-dashboard-main">
            {allocation && (
              <section className="carer-section">
                <p className="eyebrow">Your placement</p>
                <h2>{allocation.name}</h2>
                {allocation.photoUrl && <img className="allocated-greyhound-photo" src={allocation.photoUrl} alt={allocation.name} />}
                <p>
                  {allocation.age} years / {allocation.sex}
                  {allocation.colour ? ` / ${allocation.colour}` : ''}
                </p>
                <dl>
                  {allocation.feedingInformation && <div><dt>Feeding information</dt><dd>{allocation.feedingInformation}</dd></div>}
                  <div>
                    <dt>Care instructions</dt>
                    <dd>
                      {allocation.careInstructions ||
                        'GAP staff will provide your greyhound care instructions.'}
                    </dd>
                  </div>
                  {allocation.behaviourNotes && (
                    <div>
                      <dt>Behaviour notes</dt>
                      <dd>{allocation.behaviourNotes}</dd>
                    </div>
                  )}
                  {allocation.medicalNotes && (
                    <div>
                      <dt>Relevant care and safety</dt>
                      <dd>{allocation.medicalNotes}</dd>
                    </div>
                  )}
                </dl>
                <p>Contact your GAP coordinator for placement support.</p>
                {(settings?.contactEmail || settings?.contactPhone) && <p>{settings.contactEmail} {settings.contactPhone}</p>}
              </section>
            )}
            {informationRequired && (
              <section className="carer-section">
                <h2>Further information requested</h2>
                <p>{informationRequired.reviewNote}</p>
                <form
                  className="information-reply"
                  onSubmit={(event) => void sendReply(event)}
                >
                  <label htmlFor="information-reply">Your response</label>
                  <textarea
                    id="information-reply"
                    minLength={10}
                    maxLength={2000}
                    required
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                  />
                  <button className="primary-button" disabled={replying}>
                    <Send size={16} />
                    {replying ? 'Sending...' : 'Send response'}
                  </button>
                </form>
              </section>
            )}
            {applications.some((item) => item.status === 'approved') && (
              <section className="carer-section">
                <h2>Care resources</h2>
                {!resources.length && (
                  <p>Your coordinator will provide approved care resources.</p>
                )}
                {resources.map((resource) => (
                  <article className="resource-row" key={resource.id}>
                    <div>
                      <a href={resource.url} target="_blank" rel="noreferrer">
                        {resource.title} <ExternalLink size={14} />
                      </a>
                      <p>{resource.description}</p>
                    </div>
                  </article>
                ))}
              </section>
            )}
            <section
              className="current-application"
              aria-labelledby="current-application-title"
            >
              <div className="current-application__heading">
                <div>
                  <p className="eyebrow">Overview</p>
                  <h2 id="current-application-title">Current Application</h2>
                </div>
                {!isLoading && (
                  <span className="status-badge">
                    {applicationStatusLabel(latestApplication?.status)}
                  </span>
                )}
              </div>

              {isLoading ? (
                <p className="current-application__loading">
                  Loading your application…
                </p>
              ) : latestApplication ? (
                <>
                  <div className="application-details">
                    <div><span>Application ID</span><strong>{latestApplication.id}</strong></div>
                    <div><span>Submitted</span><strong>{latestApplication.submittedAt ? formatDate(latestApplication.submittedAt) : 'Not submitted'}</strong></div>
                    <div>
                      <span>Application type</span>
                      <strong>
                        {latestApplication.form.applicationType === 'adoption'
                          ? 'Adoption'
                          : 'Foster'}
                      </strong>
                    </div>
                    <div>
                      <span>Last updated</span>
                      <strong>{formatDate(latestApplication.updatedAt)}</strong>
                    </div>
                  </div>
                  {['submitted','in_review','more_information'].includes(latestApplication.status) && <button type="button" className="text-action" disabled={replying} onClick={()=>void withdraw(latestApplication.id)}>Withdraw application</button>}
                  <div className="next-step-panel">
                    <div>
                      <span>Next step</span>
                      <strong>{nextStepText(latestApplication)}</strong>
                    </div>
                    <Link className="secondary-button" to={applicationPath}>
                      {applicationAction}
                    </Link>
                  </div>
                </>
              ) : (
                <div className="current-application__empty">
                  <h3>No application started</h3>
                  <p>
                    Start a foster application when you are ready.
                    You can save it and return at any time.
                  </p>
                  <Link className="text-action" to={applicationPath}>
                    Start your application
                  </Link>
                </div>
              )}
            </section>

            {!isLoading && previousApplications.length > 0 && (
              <details className="application-history">
                <summary>
                  <span>Previous applications</span>
                  <span className="application-history__summary-meta">
                    {previousApplications.length}
                    <span
                      className="application-history__chevron"
                      aria-hidden="true"
                    />
                  </span>
                </summary>
                <div className="application-list">
                  {previousApplications.map((application) => (
                    <article className="application-row" key={application.id}>
                      <div>
                        <strong>
                          {application.form.applicationType === 'adoption'
                            ? 'Adoption Application'
                            : 'Foster Application'}
                        </strong>
                        <small>
                          Updated {formatDate(application.updatedAt)}
                        </small>
                      </div>
                      <span className="status-badge">
                        {applicationStatusLabel(application.status)}
                      </span>
                      <Link to={`/applications/${application.id}`}>
                        {application.status !== 'draft' ? 'View' : 'Edit'}
                      </Link>
                    </article>
                  ))}
                </div>
              </details>
            )}
          </div>

          <aside className="applicant-dashboard-aside">
            <figure className="applicant-home-photo">
              <img
                src="https://images.unsplash.com/photo-1754702431026-a42a5bdc9ef1?auto=format&fit=crop&w=900&q=82"
                alt="A brindle greyhound resting comfortably outdoors"
              />
              <figcaption>
                Photo by{' '}
                <a
                  href="https://unsplash.com/photos/a-brindle-greyhound-rests-on-a-red-blanket-r4_VhphM61M?utm_source=gap_portal&utm_medium=referral"
                  target="_blank"
                  rel="noreferrer"
                >
                  Derek Otway / Unsplash
                </a>
              </figcaption>
            </figure>
            <section
              className="application-process"
              aria-labelledby="application-process-title"
            >
              <p className="eyebrow">How it works</p>
              <h2 id="application-process-title">Application Process</h2>
              <ol>
                <li>
                  <span>1</span>
                  <div>
                    <strong>Complete your application</strong>
                    <small>Tell us about your home and pet experience.</small>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div>
                    <strong>GAP reviews your details</strong>
                    <small>Our team may ask for more information.</small>
                  </div>
                </li>
                <li>
                  <span>3</span>
                  <div>
                    <strong>Follow the next steps</strong>
                    <small>
                      Check this page for updates to your application.
                    </small>
                  </div>
                </li>
              </ol>
            </section>
          </aside>
        </div>
      </main>
    </ApplicantPortalShell>
  )
}
