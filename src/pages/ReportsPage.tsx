import { useCallback, useState } from 'react'
import type { ReportItem, ReportPerformance, ReportRange } from '../api/model'
import { staffApi } from '../api/staffApi'
import { reportingData } from '../api/reporting'
import { ErrorState, Loading, useResource } from '../components/AsyncView'
import { apiRequest, downloadApiFile } from '../api/http'
import { Download, ChevronLeft, ChevronRight } from 'lucide-react'
import type { StaffMember, Summary } from '../api/management'
import { statusLabels } from '../api/model'
import { shortDate } from '../api/model'
import { Link } from 'react-router-dom'

function Breakdown({ title, items }: { title: string; items: ReportItem[] }) {
  const id = `${title.toLowerCase().replaceAll(' ', '-')}-title`
  const max = Math.max(1, ...items.map((item) => item.count))
  return (
    <section className="report-breakdown" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <div className="report-bars">
        {items.map((item) => (
          <div className="report-bar-row" key={item.label}>
            <span>{item.label}</span>
            <div
              className="report-bar-track"
              role="img"
              aria-label={`${item.label}: ${item.count}`}
            >
              <span style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

function Trend({ items }: { items: ReportItem[] }) {
  const width = 720
  const height = 176
  const horizontalPadding = 24
  const verticalPadding = 28
  const max = Math.max(1, ...items.map((item) => item.count))
  const points = items.map((item, index) => ({
    ...item,
    x:
      items.length === 1
        ? width / 2
        : horizontalPadding +
          (index / (items.length - 1)) * (width - horizontalPadding * 2),
    y:
      height -
      verticalPadding -
      (item.count / max) * (height - verticalPadding * 2),
  }))
  const total = items.reduce((sum, item) => sum + item.count, 0)
  return (
    <section className="report-trend" aria-labelledby="decision-trend-title">
      <header className="report-section-heading">
        <div>
          <p className="eyebrow">Throughput</p>
          <h2 id="decision-trend-title">Decisions over time</h2>
        </div>
        <span>
          <strong>{total}</strong> completed
        </span>
      </header>
      <div className="report-trend-plot">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={items
            .map((item) => `${item.label}: ${item.count}`)
            .join(', ')}
        >
          <line
            className="report-trend-baseline"
            x1={horizontalPadding}
            x2={width - horizontalPadding}
            y1={height - verticalPadding}
            y2={height - verticalPadding}
          />
          {points.length > 1 && (
            <polyline
              className="report-trend-line"
              points={points.map((point) => `${point.x},${point.y}`).join(' ')}
            />
          )}
          {points.map((point) => (
            <g key={point.label}>
              <text
                className="report-trend-value"
                x={point.x}
                y={Math.max(14, point.y - 12)}
                textAnchor="middle"
              >
                {point.count}
              </text>
              <circle
                className="report-trend-point"
                cx={point.x}
                cy={point.y}
                r="4"
              />
            </g>
          ))}
        </svg>
        <div className="report-trend-labels" aria-hidden="true">
          {items
            .filter(
              (_, index) =>
                index % Math.max(1, Math.ceil((items.length - 1) / 3)) === 0 ||
                index === items.length - 1,
            )
            .map((item) => (
              <span key={item.label}>
                {/^\d{4}-\d{2}-\d{2}$/.test(item.label)
                  ? new Intl.DateTimeFormat('en-AU', {
                      day: 'numeric',
                      month: 'short',
                      timeZone: 'UTC',
                    }).format(new Date(item.label))
                  : item.label}
              </span>
            ))}
        </div>
      </div>
    </section>
  )
}

function compareCount(current: number, previous: number | null) {
  if (previous === null) return 'All recorded activity'
  if (previous === 0)
    return current === 0
      ? 'No change from previous period'
      : 'Up from no decisions'
  const change = Math.round(((current - previous) / previous) * 100)
  if (change === 0) return 'No change from previous period'
  return `${change > 0 ? '+' : ''}${change}% from previous period`
}

function compareRate(
  current: number | null,
  previous: number | null,
  hasPreviousPeriod: boolean,
) {
  if (current === null) return 'No completed decisions'
  if (!hasPreviousPeriod) return 'All recorded activity'
  if (previous === null) return 'No decisions in previous period'
  const change = current - previous
  if (change === 0) return 'No change from previous period'
  return `${change > 0 ? '+' : ''}${change} pts from previous period`
}

function compareTime(
  current: number | null,
  previous: number | null,
  hasPreviousPeriod: boolean,
) {
  if (current === null) return 'No completed decisions'
  if (!hasPreviousPeriod) return 'All recorded activity'
  if (previous === null) return 'No decisions in previous period'
  const change = Math.round(Math.abs(current - previous) * 10) / 10
  if (change === 0) return 'No change from previous period'
  return `${change} day${change === 1 ? '' : 's'} ${current < previous ? 'faster' : 'slower'}`
}

function reviewTime(value: number | null) {
  if (value === null) return '—'
  if (value < 0.1) return '<1 day'
  return `${value} day${value === 1 ? '' : 's'}`
}

function performanceMetrics(
  current: ReportPerformance,
  previous: ReportPerformance | null,
) {
  return [
    {
      label: 'Decisions completed',
      value: String(current.decisions),
      comparison: compareCount(current.decisions, previous?.decisions ?? null),
    },
    {
      label: 'Average decision time',
      value: reviewTime(current.averageReviewDays),
      comparison: compareTime(
        current.averageReviewDays,
        previous?.averageReviewDays ?? null,
        previous !== null,
      ),
    },
    {
      label: 'Approval rate',
      value: current.approvalRate === null ? '—' : `${current.approvalRate}%`,
      comparison: compareRate(
        current.approvalRate,
        previous?.approvalRate ?? null,
        previous !== null,
      ),
    },
    {
      label: 'Assignment rate',
      value:
        current.assignmentRate === null ? '—' : `${current.assignmentRate}%`,
      comparison: compareRate(
        current.assignmentRate,
        previous?.assignmentRate ?? null,
        previous !== null,
      ),
    },
  ]
}

export function ReportsPage({ revision }: { revision: number }) {
  const [range, setRange] = useState<ReportRange>('30d')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('')
  const [location, setLocation] = useState(''),
    [staff, setStaff] = useState(''),
    [allocated, setAllocated] = useState(''),
    [format, setFormat] = useState('csv')
  const [exportError, setExportError] = useState('')
  const [pagination, setPagination] = useState({ key: '', page: 1 })
  const load = useCallback(async () => {
    const records = await staffApi.list({
      from,
      to,
      status,
      location,
      staff,
      allocated,
    })
    return { ...reportingData(records, range), records }
  }, [range, from, to, status, location, staff, allocated])
  const key = JSON.stringify({
    range,
    from,
    to,
    status,
    location,
    staff,
    allocated,
    revision,
  })
  const { data, error, retry } = useResource(load, key)
  const pageCount = Math.max(1, Math.ceil((data?.records.length || 0) / 20))
  const page = pagination.key === key ? Math.min(pagination.page, pageCount) : 1
  const summaryLoad = useCallback(
    () =>
      apiRequest<{ summary: Summary }>(
        '/portal/staff/report-summary?' +
          new URLSearchParams({ from, to, status, location, staff, allocated }),
      ),
    [from, to, status, location, staff, allocated],
  )
  const summary = useResource(summaryLoad, key)
  const staffLoad = useCallback(
    () => apiRequest<{ staff: StaffMember[] }>('/portal/staff/directory'),
    [],
  )
  const directory = useResource(staffLoad, 'report-staff')

  return (
    <div className="reports-page">
      <header className="management-heading reports-heading">
        <div>
          <h1>Reports</h1>
          <p>Review performance and application flow.</p>
        </div>
        <label className="select-field report-range">
          <span>Decision period</span>
          <select
            value={range}
            onChange={(event) => setRange(event.target.value as ReportRange)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </label>
      </header>
      <form
        className="greyhound-filters"
        onSubmit={(event) => {
          event.preventDefault()
          setExportError('')
          const query = new URLSearchParams({
            from,
            to,
            status,
            location,
            staff,
            allocated,
          })
          void downloadApiFile(
            `/portal/staff/reports.${format}?` + query.toString(),
            `application-status.${format}`,
          ).catch((reason: Error) => setExportError(reason.message))
        }}
      >
        <label className="select-field">
          <span>From</span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="select-field">
          <span>To</span>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <label className="select-field">
          <span>Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="select-field">
          <span>Location</span>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </label>
        <label className="select-field">
          <span>Staff member</span>
          <select
            value={staff}
            onChange={(event) => setStaff(event.target.value)}
          >
            <option value="">All staff</option>
            {directory.data?.staff.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="select-field">
          <span>Allocation</span>
          <select
            value={allocated}
            onChange={(event) => setAllocated(event.target.value)}
          >
            <option value="">All placements</option>
            <option value="yes">Allocated</option>
            <option value="no">Not allocated</option>
          </select>
        </label>
        <label className="select-field">
          <span>File format</span>
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value)}
          >
            <option value="csv">CSV</option>
            <option value="xlsx">Excel</option>
          </select>
        </label>
        <button className="button secondary">
          <Download size={16} />
          Export report
        </button>
      </form>
      {exportError && (
        <p className="field-error" role="alert">
          {exportError}
        </p>
      )}
      {summary.error && (
        <ErrorState error={summary.error} retry={summary.retry} />
      )}
      {summary.data && (
        <section
          className="report-summary-stats"
          aria-label="Application status statistics"
        >
          {Object.entries({
            received: 'Applications received',
            underReview: 'Under review',
            approved: 'Approved applications',
            rejected: 'Rejected applications',
            approvedCarers: 'Approved foster carers',
            availableGreyhounds: 'Available greyhounds',
            allocatedGreyhounds: 'Allocated greyhounds',
            averageProcessingDays: 'Average processing days',
          }).map(([field, label]) => (
            <div key={field}>
              <span>{label}</span>
              <strong>
                {summary.data!.summary[field as keyof Summary] ?? '-'}
              </strong>
            </div>
          ))}
        </section>
      )}
      {error ? (
        <ErrorState error={error} retry={retry} />
      ) : !data ? (
        <Loading label="Loading reports" />
      ) : (
        <>
          <section className="report-metrics" aria-label="Review performance">
            {performanceMetrics(data.performance, data.previousPerformance).map(
              (metric) => (
                <div key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.comparison}</small>
                </div>
              ),
            )}
          </section>
          <Trend items={data.decisionTrend} />
          <div className="report-grid">
            <Breakdown
              title="Submitted application progress"
              items={data.workflow}
            />
            <Breakdown title="Application mix" items={data.applicationTypes} />
          </div>
          <section className="application-tools">
            <h2>Application Status Report</h2>
            <p>{data.records.length} matching applications</p>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Application status records"
            >
              <table className="management-table">
                <caption>Application status records</caption>
                <thead>
                  <tr>
                    {[
                      'Applicant',
                      'Email',
                      'Phone',
                      'Application ID',
                      'Submitted',
                      'Status',
                      'Approved',
                      'Greyhound',
                      'Greyhound ID',
                      'Assigned staff',
                    ].map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.records.slice((page - 1) * 20, page * 20).map((a) => (
                    <tr key={a.id}>
                      <td>
                        <Link to={'/staff/applications/' + a.id}>
                          {a.currentContact?.fullName || a.form.fullName}
                        </Link>
                      </td>
                      <td>{a.form.email}</td>
                      <td>{a.currentContact?.phone || a.form.phone}</td>
                      <td>{a.id}</td>
                      <td>{shortDate(a.submittedAt)}</td>
                      <td>{statusLabels[a.status]}</td>
                      <td>
                        {a.approvalDate ? shortDate(a.approvalDate) : '-'}
                      </td>
                      <td>{a.assignment?.name || '-'}</td>
                      <td>{a.assignment?.greyhoundId || '-'}</td>
                      <td>{a.assignedStaffName || 'Unassigned'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav className="pagination" aria-label="Report pages">
              <span>
                Page {page} of {pageCount}
              </span>
              <div>
                <button
                  className="button secondary"
                  disabled={page === 1}
                  onClick={() => setPagination({ key, page: page - 1 })}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <button
                  className="button secondary"
                  disabled={page === pageCount}
                  onClick={() => setPagination({ key, page: page + 1 })}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </nav>
          </section>
        </>
      )}
    </div>
  )
}
