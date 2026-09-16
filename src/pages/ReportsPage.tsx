import { useCallback, useState } from 'react'
import type {
  ReportItem,
  ReportPerformance,
  ReportRange,
} from '../api/model'
import { staffApi } from '../api/staffApi'
import { ErrorState, Loading, useResource } from '../components/AsyncView'

function Breakdown({
  title,
  items,
}: {
  title: string
  items: ReportItem[]
}) {
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
        <div
          className="report-trend-labels"
          style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
          aria-hidden="true"
        >
          {items.map((item) => (
            <span key={item.label}>{item.label}</span>
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
      value:
        current.approvalRate === null ? '—' : `${current.approvalRate}%`,
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
  const load = useCallback(() => staffApi.report(range), [range])
  const { data, error, retry } = useResource(load, `${range}-${revision}`)

  return (
    <div className="reports-page">
      <header className="management-heading reports-heading">
        <div>
          <h1>Reports</h1>
          <p>Review performance and application flow.</p>
        </div>
        <label className="select-field report-range">
          <span>Period</span>
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
      {error ? (
        <ErrorState error={error} retry={retry} />
      ) : !data ? (
        <Loading label="Loading reports" />
      ) : (
        <>
          <section className="report-metrics" aria-label="Review performance">
            {performanceMetrics(
              data.performance,
              data.previousPerformance,
            ).map((metric) => (
              <div key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.comparison}</small>
              </div>
            ))}
          </section>
          <Trend items={data.decisionTrend} />
          <div className="report-grid">
            <Breakdown
              title="Submitted application progress"
              items={data.workflow}
            />
            <Breakdown title="Application mix" items={data.applicationTypes} />
          </div>
        </>
      )}
    </div>
  )
}
