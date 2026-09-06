import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { Alert } from '../../../components/Alert'
import { useAuth } from '../../auth/AuthContext'
import { ApplicantPortalShell } from '../components/ApplicantPortalShell'
import { applicationStatusLabel } from '../applicationModel'
import type { StoredApplication } from '../applicationModel'
import { applicationService } from '../applicationService'

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
  if (!application) return 'Create your first foster or adoption application.'
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
  useEffect(() => {
    const refresh = (event: StorageEvent) => {
      if (event.key === 'gap.staff.records.v1')
        setRevision((value) => value + 1)
    }
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return undefined
    let isActive = true

    applicationService
      .list(user.id)
      .then((items) => {
        if (isActive) setApplications(items)
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
    latestApplication?.status !== 'draft'
      ? 'View Application'
      : 'Edit Application'

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
                    Start an adoption or foster application when you are ready.
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
