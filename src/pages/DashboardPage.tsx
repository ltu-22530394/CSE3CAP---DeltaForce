import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { staffApi } from '../api/staffApi'
import { longDate } from '../api/model'
import { ApplicationRows } from '../components/ApplicationRows'
import { ErrorState, Loading, useResource } from '../components/AsyncView'

export function DashboardPage({ revision }: { revision: number }) {
  const load = useCallback(() => staffApi.dashboard(), [])
  const { data, error, retry } = useResource(load, String(revision))
  if (error) return <ErrorState error={error} retry={retry} />
  if (!data) return <Loading label="Loading your overview" />
  const metrics = [
    { label: 'Pending applications', value: data.pending, status: 'pending' },
    { label: 'In progress', value: data.inProgress, status: 'in_progress' },
    { label: 'Approved', value: data.approved, status: 'approved' },
    { label: 'Rejected', value: data.rejected, status: 'rejected' },
  ]
  const max = Math.max(
    6,
    Math.ceil(Math.max(...data.days.map((d) => d.count)) / 3) * 3,
  )
  const ticks = [max, (max / 3) * 2, max / 3, 0]
  const progress = [
    { count: data.pending, label: 'awaiting review' },
    { count: data.inProgress, label: 'in progress' },
    { count: data.completed, label: 'completed this week' },
  ]
  return (
    <div className="dashboard-page">
      <header className="dashboard-heading">
        <h1>{longDate(data.now)}</h1>
        <p className="dashboard-intro">
          Here is today’s adoption programme overview.
        </p>
      </header>
      <section
        className="overview-strip"
        aria-label="Application status overview"
      >
        <div className="metrics">
          {metrics.map((m) => (
            <Link
              to={`/staff/applications?status=${m.status}`}
              className="metric"
              key={m.label}
            >
              <span>{m.label}</span>
              <strong>{m.value}</strong>
            </Link>
          ))}
        </div>
        {data.next ? (
          <Link
            className="button primary review-next"
            to={`/staff/applications/${data.next}`}
          >
            Review next application
          </Link>
        ) : (
          <span className="muted no-review">You’re all caught up.</span>
        )}
      </section>
      <div className="dashboard-insights">
        <section className="weekly-section" aria-labelledby="weekly-title">
          <header className="section-heading">
            <h2 id="weekly-title">Applications this week</h2>
            <span className="weekly-total">
              <strong>{data.weeklyTotal}</strong> submitted
            </span>
          </header>
          <div
            className="weekly-chart"
            role="img"
            aria-label={`Applications submitted this week: ${data.days.map((d) => `${d.label}: ${d.count}`).join(', ')}. Total ${data.weeklyTotal}.`}
          >
            <div className="chart-scale">
              {ticks.map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>
            <div className="chart-plot">
              <div className="chart-grid" aria-hidden="true">
                {ticks.map((n) => (
                  <span key={n} />
                ))}
              </div>
              <div className="chart-columns">
                {data.days.map((d) => (
                  <div className="chart-column" key={d.label}>
                    <div className="bar-track">
                      <div
                        className="chart-bar"
                        style={{ height: `${(d.count / max) * 100}%` }}
                      >
                        <span className="chart-value">{d.count}</span>
                      </div>
                    </div>
                    <span className="chart-label">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section className="progress-section" aria-labelledby="progress-title">
          <h2 id="progress-title">Review progress</h2>
          <div className="progress-list">
            {progress.map((p, i) => (
              <div className="progress-row" key={p.label}>
                <strong>{p.count}</strong>
                <span>{p.label}</span>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-label={p.label}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={data.percentages[i]}
                >
                  <span style={{ width: `${data.percentages[i]}%` }} />
                </div>
                <span className="progress-percentage">
                  {data.percentages[i]}%
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="recent-section" aria-labelledby="recent-title">
        <header className="section-heading recent-heading">
          <h2 id="recent-title">Recent applications</h2>
          <Link className="text-link" to="/staff/applications">
            View all applications
          </Link>
        </header>
        {data.recent.length ? (
          <ApplicationRows applications={data.recent} compact />
        ) : (
          <p className="empty-inline">
            New applications will appear here when they are submitted.
          </p>
        )}
      </section>
    </div>
  )
}
