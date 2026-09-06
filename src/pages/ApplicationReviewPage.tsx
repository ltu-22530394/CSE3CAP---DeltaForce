import { useCallback, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { Application, Decision } from '../api/model'
import { initials, isClosed, shortDate, statusLabels } from '../api/model'
import { staffApi } from '../api/staffApi'
import { StatusText } from '../components/ApplicationRows'
import { ErrorState, Loading, useResource } from '../components/AsyncView'
import { DecisionDialog } from '../components/DecisionDialog'
import { Icon } from '../components/Icon'
import { useFeedback } from '../components/Feedback'
function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="detail">
      <dt>{label}</dt>
      <dd>{children || 'Not provided'}</dd>
    </div>
  )
}
export function ApplicationReviewPage({
  revision,
  changed,
}: {
  revision: number
  changed: () => void
}) {
  const { applicationId = '' } = useParams()
  const { search } = useLocation()
  const load = useCallback(async () => {
    const params = new URLSearchParams(search)
    const [application, list] = await Promise.all([
      staffApi.get(applicationId),
      staffApi.list({
        q: params.get('q') || '',
        status: params.get('status') || '',
        type: params.get('type') || '',
        sort: params.get('sort') || 'newest',
      }),
    ])
    return { application, list }
  }, [applicationId, search])
  const { data, error, retry } = useResource(
    load,
    `${applicationId}-${revision}-${search}`,
  )
  const [action, setAction] = useState<{
    id: string
    decision: Decision
  } | null>(null)
  const notify = useFeedback()
  if (error)
    return (
      <>
        <Link className="back-link" to={`/staff/applications${search}`}>
          <Icon name="back" />
          Back to applications
        </Link>
        <ErrorState error={error} retry={retry} />
      </>
    )
  if (!data) return <Loading label="Loading application" />
  const { application: a, list } = data
  const index = list.findIndex((item) => item.id === a.id)
  const prev = index > 0 ? list[index - 1] : null,
    next = index >= 0 ? list[index + 1] : null
  const form = a.form
  const closed = isClosed(a.status)
  function completed(updated: Application) {
    setAction(null)
    changed()
    notify(
      updated.status === 'more_information'
        ? 'Request for information saved.'
        : updated.status === 'in_review'
          ? 'Review started.'
          : `Application ${statusLabels[updated.status].toLowerCase()}.`,
    )
  }
  return (
    <div className="review-page">
      <div className="review-navigation">
        <Link className="back-link" to={`/staff/applications${search}`}>
          <Icon name="back" />
          Back to applications
        </Link>
        <nav aria-label="Adjacent applications">
          <span className="muted">
            {index >= 0
              ? `${index + 1} of ${list.length}`
              : 'Outside current filters'}
          </span>
          {prev ? (
            <Link
              className="button secondary"
              aria-label="Previous application"
              to={`/staff/applications/${prev.id}${search}`}
            >
              <Icon name="back" />
              <span>Previous</span>
            </Link>
          ) : (
            <button
              className="button secondary"
              disabled
              aria-label="Previous application"
            >
              <Icon name="back" />
              <span>Previous</span>
            </button>
          )}
          {next ? (
            <Link
              className="button secondary"
              aria-label="Next application"
              to={`/staff/applications/${next.id}${search}`}
            >
              <span>Next</span>
              <Icon name="back" className="forward" />
            </Link>
          ) : (
            <button
              className="button secondary"
              disabled
              aria-label="Next application"
            >
              <span>Next</span>
              <Icon name="back" className="forward" />
            </button>
          )}
        </nav>
      </div>
      <header className="review-heading">
        <div className="review-person">
          <span className="avatar review-avatar">
            {initials(form.fullName)}
          </span>
          <div>
            <p className="eyebrow">
              {a.id} · {form.applicationType}
            </p>
            <h1>{form.fullName}</h1>
            <p>Submitted {shortDate(a.submittedAt)}</p>
          </div>
        </div>
        <StatusText status={a.status} />
      </header>
      <div className="review-content">
        <div className="review-details">
          <section className="detail-section">
            <h2>Personal details</h2>
            <dl className="detail-grid">
              <Detail label="Full name">{form.fullName}</Detail>
              <Detail label="Date of birth">{form.dateOfBirth}</Detail>
              <Detail label="Application type">{form.applicationType}</Detail>
            </dl>
          </section>
          <section className="detail-section">
            <h2>Contact & address</h2>
            <dl className="detail-grid">
              <Detail label="Email">
                <a href={`mailto:${form.email}`}>{form.email}</a>
              </Detail>
              <Detail label="Phone">
                <a href={`tel:${form.phone.replaceAll(' ', '')}`}>
                  {form.phone}
                </a>
              </Detail>
              <Detail label="Residential address">{form.address}</Detail>
            </dl>
          </section>
          <section className="detail-section">
            <h2>Home environment</h2>
            <dl className="detail-grid">
              <Detail label="Residence type">{form.residenceType}</Detail>
              <Detail label="Housing status">{form.housingStatus}</Detail>
              <Detail label="Landlord permission">
                {form.landlordPermission}
              </Detail>
              <Detail label="Adults in the home">{form.adultsInHome}</Detail>
              <Detail label="Children in the home">
                {form.childrenInHome}
              </Detail>
              <Detail label="Secure yard">{form.secureYard}</Detail>
            </dl>
          </section>
          <section className="detail-section">
            <h2>Pet experience</h2>
            <dl className="detail-grid">
              <Detail label="Experience with greyhounds">
                {form.greyhoundExperience}
              </Detail>
              <Detail label="Current pets">{form.hasCurrentPets}</Detail>
              <div className="detail full-width">
                <dt>Dog ownership & care experience</dt>
                <dd>{form.dogExperience}</dd>
              </div>
              <div className="detail full-width">
                <dt>Current pet details</dt>
                <dd>
                  {form.hasCurrentPets === 'Yes'
                    ? form.currentPetsDetails || 'Not provided'
                    : 'No current pets'}
                </dd>
              </div>
            </dl>
          </section>
          <section className="detail-section declaration">
            <h2>Declaration</h2>
            <p>
              <Icon name={form.confirmAccurate ? 'check' : 'close'} />
              {form.confirmAccurate
                ? 'The applicant confirmed that the information provided is accurate.'
                : 'The applicant has not confirmed the accuracy of this information.'}
            </p>
          </section>
        </div>
        <aside
          className="review-aside"
          aria-label="Review decision and history"
        >
          <section className="decision-section">
            <h2>{closed ? 'Decision recorded' : 'Application review'}</h2>
            <p>
              {closed
                ? `This application was ${statusLabels[a.status].toLowerCase()} on ${shortDate(a.updatedAt)}.`
                : a.status === 'more_information'
                  ? 'Waiting for the applicant to provide the requested information.'
                  : 'Review the applicant’s details before recording a decision.'}
            </p>
            {!closed && (
              <div className="decision-buttons">
                {(a.status === 'pending' ||
                  a.status === 'more_information') && (
                  <button
                    className="button secondary"
                    onClick={() =>
                      setAction({ id: a.id, decision: 'in_review' })
                    }
                  >
                    {a.status === 'more_information'
                      ? 'Resume review'
                      : 'Start review'}
                  </button>
                )}
                <button
                  className="button primary"
                  onClick={() => setAction({ id: a.id, decision: 'approved' })}
                >
                  Approve
                </button>
                <button
                  className="button secondary"
                  onClick={() =>
                    setAction({ id: a.id, decision: 'more_information' })
                  }
                  disabled={a.status === 'more_information'}
                >
                  Request more information
                </button>
                <button
                  className="button text-button"
                  onClick={() => setAction({ id: a.id, decision: 'rejected' })}
                >
                  Reject application
                </button>
              </div>
            )}
          </section>
          <section className="activity-section">
            <h2>Activity</h2>
            <ol className="activity-list">
              {[...a.history].reverse().map((event) => (
                <li key={event.id}>
                  <strong>
                    {event.status === 'pending'
                      ? 'Application submitted'
                      : event.status === 'more_information'
                        ? 'Information requested'
                        : event.status === 'in_review'
                          ? 'Review started'
                          : `Application ${statusLabels[event.status].toLowerCase()}`}
                  </strong>
                  <p className="activity-meta">
                    {event.author}
                    <br />
                    <time dateTime={event.at}>
                      {shortDate(event.at)} ·{' '}
                      {new Intl.DateTimeFormat('en-AU', {
                        hour: 'numeric',
                        minute: '2-digit',
                      }).format(new Date(event.at))}
                    </time>
                  </p>
                  <p className="activity-note">{event.note}</p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
      {action?.id === a.id && (
        <DecisionDialog
          key={`${a.id}-${action.decision}`}
          application={a}
          decision={action.decision}
          close={() => setAction(null)}
          complete={completed}
        />
      )}
    </div>
  )
}
