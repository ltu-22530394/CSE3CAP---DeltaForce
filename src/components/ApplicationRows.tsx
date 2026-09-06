import { Link } from 'react-router-dom'
import type { Application, Status } from '../api/model'
import { initials, shortDate, statusLabels } from '../api/model'
import { Icon } from './Icon'
export function StatusText({ status }: { status: Status }) {
  return (
    <span className={`status-text status-${status}`}>
      {statusLabels[status]}
    </span>
  )
}
export function ApplicationRows({
  applications,
  search = '',
  compact = false,
}: {
  applications: Application[]
  search?: string
  compact?: boolean
}) {
  return (
    <div className={compact ? 'recent-list' : 'application-list'}>
      {!compact && (
        <div className="application-list-head" aria-hidden="true">
          <span>Applicant</span>
          <span>Type</span>
          <span>Submitted</span>
          <span>Status</span>
          <span />
        </div>
      )}
      {applications.map((a) => (
        <Link
          className="application-row"
          key={a.id}
          to={`/staff/applications/${a.id}${search}`}
          aria-label={`Open ${a.form.fullName}'s ${a.form.applicationType.toLowerCase()} application, ${statusLabels[a.status]}`}
        >
          <span className="applicant-name">
            <span className="avatar">{initials(a.form.fullName)}</span>
            <span>
              {a.form.fullName}
              {!compact && <small>{a.id}</small>}
            </span>
          </span>
          <span className="application-type">{a.form.applicationType}</span>
          <time className="application-date" dateTime={a.submittedAt}>
            {shortDate(a.submittedAt)}
          </time>
          <StatusText status={a.status} />
          {!compact && <Icon name="back" className="forward" />}
        </Link>
      ))}
    </div>
  )
}
