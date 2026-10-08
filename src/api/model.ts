export const statusLabels = {
  pending: 'Pending review',
  in_review: 'In review',
  more_information: 'More information',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  inactive: 'Inactive',
} as const
export type Status = keyof typeof statusLabels
export type ApplicationType = 'Adoption' | 'Foster'
export type Decision =
  'approved' | 'rejected' | 'more_information' | 'in_review'
export interface StaffUser {
  id: string
  name: string
  role: string
  email: string
}
export const greyhoundStatusLabels = {
  available: 'Available',
  medical_hold: 'Medical hold',
  assigned: 'Allocated',
  imported: 'Imported',
  pending_allocation: 'Pending allocation',
  returned: 'Returned',
  adopted: 'Adopted',
  unavailable: 'Unavailable',
  inactive: 'Inactive',
} as const
export type GreyhoundStatus = keyof typeof greyhoundStatusLabels
export type GreyhoundSex = 'Female' | 'Male' | 'Unknown'
export type GreyhoundEditableStatus = Exclude<GreyhoundStatus, 'assigned'>
export interface GreyhoundDetails {
  identifier?: string
  salesforceId?: string
  registrationNumber?: string
  dateOfBirth?: string
  colour?: string
  location?: string
  careInstructions?: string
  feedingInformation?: string
  behaviourNotes?: string
  medicalNotes?: string
  specialRequirements?: string
  photoUrl?: string
  compatibleWithChildren?: number | null
  compatibleWithCats?: number | null
  compatibleWithSmallDogs?: number | null
  compatibleWithOtherAnimals?: number | null
}
export interface Greyhound extends GreyhoundDetails {
  id: string
  name: string
  age: number
  sex: GreyhoundSex
  status: GreyhoundStatus
  identifier?: string
  salesforceId?: string
  registrationNumber?: string
}
export interface GreyhoundInput extends GreyhoundDetails {
  id?: string
  name: string
  age: number
  sex: GreyhoundSex
  status: GreyhoundStatus
}
export interface GreyhoundFilters {
  q?: string
  status?: string
  sort?: string
  location?: string
  colour?: string
  minAge?: string
  maxAge?: string
  compatibility?: string
  allocated?: string
}
export type ReportRange = '7d' | '30d' | 'all'
export interface ReportItem {
  label: string
  count: number
}
export interface ReportPerformance {
  decisions: number
  approvalRate: number | null
  assignmentRate: number | null
  averageReviewDays: number | null
}
export interface ReportingData {
  range: ReportRange
  performance: ReportPerformance
  previousPerformance: ReportPerformance | null
  decisionTrend: ReportItem[]
  workflow: ReportItem[]
  applicationTypes: ReportItem[]
}
export interface GreyhoundAssignment {
  allocationId?: string
  greyhoundId: string
  name: string
  age: number
  sex: GreyhoundSex
  assignedAt: string
  assignedBy: string
  colour?: string
  careInstructions?: string
  behaviourNotes?: string
  medicalNotes?: string
  feedingInformation?: string
  photoUrl?: string
  internalNotes?: string
  startDate?: string
  endDate?: string
}
export interface ApplicationForm {
  suburb?: string
  state?: string
  postcode?: string
  fenceInformation?: string
  yardInformation?: string
  householdDetails?: string
  preferredGreyhoundCharacteristics?: string
  preferredFosteringPeriod?: string
  availability?: string
  transportAvailability?: string
  reasonForApplying?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  termsAccepted?: boolean
  privacyConsent?: boolean
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
  label?: string
}
export interface Application {
  id: string
  status: Status
  form: ApplicationForm
  submittedAt: string
  updatedAt: string
  revision: number
  history: Activity[]
  assignment?: GreyhoundAssignment
  assignedStaffId?: string
  assignedStaffName?: string
  approvalDate?: string
  editable?: boolean
  currentContact?: {
    fullName?: string
    phone?: string
    address?: string
    suburb?: string
    state?: string
    postcode?: string
  }
}
export interface Filters {
  q?: string
  status?: string
  type?: string
  sort?: string
  from?: string
  to?: string
  location?: string
  staff?: string
  allocated?: string
}
export const isClosed = (status: Status) =>
  ['approved', 'rejected', 'withdrawn', 'inactive'].includes(status)
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
