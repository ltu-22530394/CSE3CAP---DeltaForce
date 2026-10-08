import type {
  Application,
  ReportPerformance,
  ReportRange,
  ReportingData,
} from './model'
import { isClosed } from './model'

export function reportingData(
  applications: Application[],
  range: ReportRange,
): ReportingData {
  const now = new Date()
  const days = range === '7d' ? 7 : 30
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - days + 1)
  const previous = new Date(start)
  previous.setDate(previous.getDate() - days)
  const current = (date: string) =>
    range === 'all' || (new Date(date) >= start && new Date(date) <= now)
  const decisions = applications.flatMap((application) => {
    const event = [...application.history]
      .reverse()
      .find((item) => ['approved','rejected'].includes(item.status) && !item.label)
    return event ? [{ application, event }] : []
  })
  const metrics = (items: typeof decisions): ReportPerformance => {
    const approved = items.filter((item) => item.event.status === 'approved')
    const reviewDays = items.map((item) =>
      Math.max(
        0,
        (Date.parse(item.event.at) - Date.parse(item.application.submittedAt)) /
          86400000,
      ),
    )
    return {
      decisions: items.length,
      approvalRate: items.length
        ? Math.round((approved.length / items.length) * 100)
        : null,
      assignmentRate: approved.length
        ? Math.round(
            (approved.filter((item) => item.application.assignment).length /
              approved.length) *
              100,
          )
        : null,
      averageReviewDays: items.length
        ? Math.round(
            (reviewDays.reduce((sum, value) => sum + value, 0) / items.length) *
              10,
          ) / 10
        : null,
    }
  }
  const selected = applications.filter((application) =>
    current(application.submittedAt),
  )
  const currentDecisions = decisions.filter((item) => current(item.event.at))
  const trend = new Map<string, number>()
  if (range === 'all') {
    for (const item of currentDecisions) {
      const key = item.event.at.slice(0, 7)
      trend.set(key, (trend.get(key) || 0) + 1)
    }
  } else {
    for (let index = 0; index < days; index++) {
      const date = new Date(start)
      date.setDate(date.getDate() + index)
      trend.set(date.toISOString().slice(0, 10), 0)
    }
    for (const item of currentDecisions) {
      const key = item.event.at.slice(0, 10)
      trend.set(key, (trend.get(key) || 0) + 1)
    }
  }
  return {
    range,
    performance: metrics(currentDecisions),
    previousPerformance:
      range === 'all'
        ? null
        : metrics(
            decisions.filter(
              (item) =>
                new Date(item.event.at) >= previous &&
                new Date(item.event.at) < start,
            ),
          ),
    decisionTrend: [...trend]
      .map(([label, count]) => ({ label, count }))
      .slice(-30),
    workflow: [
      { label: 'Submitted', count: selected.length },
      {
        label: 'Review started',
        count: selected.filter((item) => item.history.length > 1).length,
      },
      {
        label: 'Decision recorded',
        count: selected.filter((item) => isClosed(item.status)).length,
      },
      {
        label: 'Greyhound assigned',
        count: selected.filter((item) => item.assignment).length,
      },
    ],
    applicationTypes: [{ label: 'Foster', count: selected.length }],
  }
}
