export const statusLabels = {
  pending: 'Pending review',
  in_review: 'In review',
  more_information: 'More information',
  approved: 'Approved',
  rejected: 'Rejected',
} as const
export type Status = keyof typeof statusLabels
export type ApplicationType = 'Adoption' | 'Foster'
export type Decision =
  | 'approved'
  | 'rejected'
  | 'more_information'
  | 'in_review'
export interface StaffUser {
  id: string
  name: string
  role: string
  email: string
}
export interface ApplicationForm {
  fullName: string
  dateOfBirth: string
  email: string
  phone: string
  address: string
  residenceType: string
  housingStatus: string
  landlordPermission: string
  adultsInHome: string
  childrenInHome: string
  secureYard: string
  applicationType: ApplicationType
  dogExperience: string
  greyhoundExperience: string
  hasCurrentPets: string
  currentPetsDetails: string
  confirmAccurate: boolean
}
export interface Activity {
  id: string
  at: string
  status: Status
  author: string
  note: string
}
export interface Application {
  id: string
  status: Status
  form: ApplicationForm
  submittedAt: string
  updatedAt: string
  revision: number
  history: Activity[]
}
export interface Filters {
  q?: string
  status?: string
  type?: string
  sort?: string
}
export const isClosed = (status: Status) =>
  status === 'approved' || status === 'rejected'
export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
}
export const shortDate = (value: string | Date) =>
  new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(value))
    .replace('Sept', 'Sep')
export const longDate = (value: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(value)
export function weekStart(date: Date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7))
  return result
}
export function dashboardSummary(applications: Application[], now: Date) {
  const start = weekStart(now)
  const weekEnd = new Date(start)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const withinWeek = (at: string) =>
    new Date(at) >= start && new Date(at) < weekEnd && new Date(at) <= now
  const pending = applications.filter((a) => a.status === 'pending').length
  const inProgress = applications.filter(
    (a) => a.status === 'in_review' || a.status === 'more_information',
  ).length
  const approved = applications.filter((a) => a.status === 'approved').length
  const rejected = applications.filter((a) => a.status === 'rejected').length
  const completed = applications.filter(
    (a) =>
      isClosed(a.status) &&
      a.history.some((h) => isClosed(h.status) && withinWeek(h.at)),
  ).length
  const days = Array.from({ length: 7 }, (_, day) => {
    const date = new Date(start)
    date.setDate(date.getDate() + day)
    const count = applications.filter(
      (a) =>
        withinWeek(a.submittedAt) &&
        new Date(a.submittedAt).toDateString() === date.toDateString(),
    ).length
    return {
      label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day],
      date,
      count,
      future: date > now,
    }
  })
  const denominator = pending + inProgress + completed
  const percentages = denominator
    ? [
        Math.round((pending / denominator) * 100),
        Math.round((inProgress / denominator) * 100),
        0,
      ]
    : [0, 0, 0]
  if (denominator) percentages[2] = 100 - percentages[0] - percentages[1]
  return {
    pending,
    inProgress,
    approved,
    rejected,
    completed,
    percentages,
    days,
    weeklyTotal: days.reduce((n, d) => n + d.count, 0),
  }
}
