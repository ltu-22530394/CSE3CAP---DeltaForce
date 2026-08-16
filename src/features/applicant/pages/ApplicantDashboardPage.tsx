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
  if (application.status === 'submitted') {
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
        if (isActive) setError('Applications could not be loaded. Please try again.')
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [user])

  if (!user) return null

  const latestApplication = applications[0]
  const applicationPath = latestApplication
    ? `/applications/${latestApplication.id}`
    : '/applications/new'
  const applicationAction = latestApplication?.status === 'submitted' ? 'View Application' : 'Edit Application'

  return (
    <ApplicantPortalShell activeItem="dashboard">
      <main className="dashboard-page">
        {locationState?.applicationMessage && (
          <Alert tone="success">{locationState.applicationMessage}</Alert>
        )}
        {error && <Alert>{error}</Alert>}

        <div className="dashboard-heading">
          <div>
            <p className="eyebrow">Applicant Dashboard</p>
            <h1>Welcome back, {user.fullName}!</h1>
            <p>Manage your application and view its current status.</p>
          </div>
          <Link className="primary-button" to="/applications/new">
            Create New Application
          </Link>
        </div>

        <section className="dashboard-cards" aria-label="Application overview">
          <article className="dashboard-card">
            <p className="dashboard-card__label">Application Status</p>
            <h2>{isLoading ? 'Loading…' : applicationStatusLabel(latestApplication?.status)}</h2>
            <p>
              {latestApplication
                ? `Last updated ${formatDate(latestApplication.updatedAt)}`
                : 'No application has been started.'}
            </p>
            {!isLoading && (
              <Link to={applicationPath}>
                {latestApplication ? applicationAction : 'Start Application'}
              </Link>
            )}
          </article>

          <article className="dashboard-card">
            <p className="dashboard-card__label">Next Step</p>
            <h2>{latestApplication?.status === 'submitted' ? 'Wait for Review' : 'Complete Application'}</h2>
            <p>{nextStepText(latestApplication)}</p>
          </article>

          <article className="dashboard-card">
            <p className="dashboard-card__label">Assigned Greyhound</p>
            <h2>Not Assigned</h2>
            <p>A match will appear here after your application is approved.</p>
          </article>

          <article className="dashboard-card">
            <p className="dashboard-card__label">Training Materials</p>
            <h2>Coming Later</h2>
            <p>Materials become available after approval and dog assignment.</p>
          </article>
        </section>

        <section className="dashboard-section" id="applications">
          <div className="section-heading">
            <div>
              <p className="eyebrow">My Applications</p>
              <h2>Application History</h2>
            </div>
          </div>

          {isLoading ? (
            <p>Loading applications…</p>
          ) : applications.length === 0 ? (
            <div className="empty-state">
              <h3>No applications yet</h3>
              <p>Start a foster or adoption application when you are ready.</p>
            </div>
          ) : (
            <div className="application-list">
              {applications.map((application) => (
                <article className="application-row" key={application.id}>
                  <div>
                    <strong>
                      {application.form.applicationType === 'adoption'
                        ? 'Adoption Application'
                        : 'Foster Application'}
                    </strong>
                    <small>Updated {formatDate(application.updatedAt)}</small>
                  </div>
                  <span className="status-badge">
                    {applicationStatusLabel(application.status)}
                  </span>
                  <Link to={`/applications/${application.id}`}>
                    {application.status === 'submitted' ? 'View' : 'Edit'}
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section profile-summary" id="profile">
          <p className="eyebrow">Profile</p>
          <h2>Your Details</h2>
          <dl>
            <div>
              <dt>Full name</dt>
              <dd>{user.fullName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
          </dl>
        </section>

        <aside className="dashboard-note">
          <strong>Thank you for considering fostering or adopting a greyhound.</strong>
          <span>The GAP team will contact you after reviewing a submitted application.</span>
        </aside>
      </main>
    </ApplicantPortalShell>
  )
}
