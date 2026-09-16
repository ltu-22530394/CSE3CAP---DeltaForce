import type { StoredApplication } from '../applicant/features/applicant/applicationModel'
import { dashboardSummary, isClosed } from './model'
import type {
  Application,
  Decision,
  Filters,
  Greyhound,
  GreyhoundFilters,
  GreyhoundInput,
  ReportRange,
  ReportingData,
  StaffUser,
  Status,
} from './model'
import {
  seedApplications,
  seedGreyhounds,
  staffUser,
  samplePassword,
} from './seed'

export const STORAGE_KEY = 'gap.staff.records.v1'
export const GREYHOUNDS_KEY = 'gap.staff.greyhounds.v1'
export const SESSION_KEY = 'gap.staff.session.v1'
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
export interface DataStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
export function createStaffApi(
  storage: DataStore,
  delay = 240,
  clock = () => new Date(),
) {
  const pause = () => new Promise<void>((resolve) => setTimeout(resolve, delay))
  function save(key: string, value: unknown) {
    try {
      storage.setItem(key, JSON.stringify(value))
    } catch {
      throw new ApiError(
        'Your changes could not be saved. Check your browser storage and try again.',
        'STORAGE_ERROR',
      )
    }
  }
  function parse(key: string) {
    try {
      const value = storage.getItem(key)
      return value === null ? null : JSON.parse(value)
    } catch {
      throw new ApiError(
        'Saved data could not be opened. Please try again or restore your browser data.',
        'STORAGE_ERROR',
      )
    }
  }
  function session(): StaffUser | null {
    const value = parse(SESSION_KEY)
    if (value === null) return null
    if (value === false) return null
    if (
      typeof value === 'object' &&
      value.id === staffUser.id &&
      value.email === staffUser.email
    )
      return staffUser
    return null
  }
  function requireStaff() {
    const user = session()
    if (!user)
      throw new ApiError('Please log in to continue.', 'UNAUTHENTICATED')
    return user
  }
  function records(): Application[] {
    let value = parse(STORAGE_KEY)
    if (value === null) {
      value = seedApplications(clock())
      save(STORAGE_KEY, value)
    }
    if (
      !Array.isArray(value) ||
      value.some(
        (a) =>
          !a?.id ||
          !a?.form?.fullName ||
          !Array.isArray(a.history) ||
          ![
            'pending',
            'in_review',
            'more_information',
            'approved',
            'rejected',
          ].includes(a.status),
      )
    )
      throw new ApiError(
        'Application data could not be opened. Please restore your browser data.',
        'STORAGE_ERROR',
      )
    const submissions = (parse('gap.mock.applications') ??
      []) as StoredApplication[]
    if (!Array.isArray(submissions))
      throw new ApiError(
        'Application data could not be opened.',
        'STORAGE_ERROR',
      )
    const displayValue = (value: string) =>
      ({
        yes: 'Yes',
        no: 'No',
        owner: 'Own',
        renting: 'Rent',
        house: 'House',
        apartment: 'Apartment',
        townhouse: 'Townhouse',
        other: 'Other',
        'not-applicable': 'Not applicable',
      })[value] ||
      value ||
      'Not applicable'
    const imported: Application[] = submissions
      .filter(
        (a) =>
          a.status !== 'draft' &&
          a.submittedAt &&
          !value.some((record: Application) => record.id === a.id),
      )
      .map((a) => ({
        id: a.id,
        status: 'pending',
        form: {
          ...a.form,
          residenceType: displayValue(a.form.residenceType),
          housingStatus: displayValue(a.form.housingStatus),
          landlordPermission: displayValue(a.form.landlordPermission),
          secureYard: displayValue(a.form.secureYard),
          greyhoundExperience: displayValue(a.form.greyhoundExperience),
          hasCurrentPets: displayValue(a.form.hasCurrentPets),
          applicationType:
            a.form.applicationType.toLowerCase() === 'foster'
              ? 'Foster'
              : 'Adoption',
        },
        submittedAt: a.submittedAt!,
        updatedAt: a.updatedAt,
        revision: 0,
        history: [
          {
            id: `${a.id}-submitted`,
            at: a.submittedAt!,
            status: 'pending',
            author: a.form.fullName,
            note: 'Application submitted.',
          },
        ],
      }))
    if (imported.length) {
      value = [...value, ...imported]
      save(STORAGE_KEY, value)
    }
    return value
  }
  function greyhoundRecords(): Greyhound[] {
    let value = parse(GREYHOUNDS_KEY)
    if (value === null) {
      value = seedGreyhounds
      save(GREYHOUNDS_KEY, value)
    }
    if (
      !Array.isArray(value) ||
      value.some(
        (greyhound) =>
          !greyhound?.id ||
          !greyhound?.name ||
          !Number.isInteger(greyhound?.age) ||
          !['Female', 'Male'].includes(greyhound?.sex) ||
          !['available', 'medical_hold'].includes(greyhound?.status),
      )
    )
      throw new ApiError(
        'Greyhound data could not be opened. Please restore your browser data.',
        'STORAGE_ERROR',
      )
    return value
  }
  function greyhoundsWithAssignments() {
    const assignedIds = new Set(
      records()
        .map((application) => application.assignment?.greyhoundId)
        .filter((id): id is string => Boolean(id)),
    )
    return greyhoundRecords().map(
      (greyhound): Greyhound => ({
        ...greyhound,
        status: assignedIds.has(greyhound.id) ? 'assigned' : greyhound.status,
      }),
    )
  }
  function filterGreyhounds(
    items: Greyhound[],
    filters: GreyhoundFilters = {},
  ) {
    const query = filters.q?.trim().toLowerCase() || ''
    return items
      .filter(
        (greyhound) =>
          (!query ||
            [greyhound.id, greyhound.name, greyhound.sex].some((value) =>
              value.toLowerCase().includes(query),
            )) &&
          (!filters.status || greyhound.status === filters.status),
      )
      .sort((a, b) =>
        filters.sort === 'oldest'
          ? b.age - a.age || a.name.localeCompare(b.name)
          : filters.sort === 'youngest'
            ? a.age - b.age || a.name.localeCompare(b.name)
            : a.name.localeCompare(b.name),
      )
  }
  function filter(items: Application[], filters: Filters = {}) {
    const query = filters.q?.trim().toLowerCase() || ''
    const selected = items.filter(
      (a) =>
        (!query ||
          [a.id, a.form.fullName, a.form.email, a.form.address].some((v) =>
            v.toLowerCase().includes(query),
          )) &&
        (!filters.type || a.form.applicationType === filters.type) &&
        (!filters.status ||
          (filters.status === 'in_progress'
            ? a.status === 'in_review' || a.status === 'more_information'
            : a.status === filters.status)),
    )
    return selected.sort((a, b) =>
      filters.sort === 'name'
        ? a.form.fullName.localeCompare(b.form.fullName)
        : filters.sort === 'oldest'
          ? a.submittedAt.localeCompare(b.submittedAt) ||
            a.id.localeCompare(b.id)
          : b.submittedAt.localeCompare(a.submittedAt) ||
            b.id.localeCompare(a.id),
    )
  }
  return {
    session,
    async login(email: string, password: string) {
      await pause()
      if (
        email.trim().toLowerCase() !== staffUser.email ||
        password !== samplePassword
      )
        throw new ApiError(
          'Email or password is incorrect.',
          'INVALID_CREDENTIALS',
        )
      save(SESSION_KEY, staffUser)
      return staffUser
    },
    logout() {
      save(SESSION_KEY, false)
    },
    async list(filters: Filters = {}) {
      await pause()
      requireStaff()
      return filter(records(), filters)
    },
    async get(id: string) {
      await pause()
      requireStaff()
      const item = records().find((a) => a.id === id)
      if (!item)
        throw new ApiError('This application could not be found.', 'NOT_FOUND')
      return item
    },
    async listGreyhounds(filters: GreyhoundFilters = {}) {
      await pause()
      requireStaff()
      return filterGreyhounds(greyhoundsWithAssignments(), filters)
    },
    async saveGreyhound(input: GreyhoundInput) {
      await pause()
      requireStaff()
      const items = greyhoundRecords()
      const name = input.name.trim()
      if (name.length < 2 || name.length > 80)
        throw new ApiError(
          'Enter a greyhound name between 2 and 80 characters.',
          'VALIDATION',
        )
      if (!Number.isInteger(input.age) || input.age < 1 || input.age > 20)
        throw new ApiError('Enter an age from 1 to 20 years.', 'VALIDATION')
      if (!['Female', 'Male'].includes(input.sex))
        throw new ApiError('Choose a sex.', 'VALIDATION')
      if (!['available', 'medical_hold'].includes(input.status))
        throw new ApiError('Choose an available status.', 'VALIDATION')
      if (input.id) {
        const index = items.findIndex((greyhound) => greyhound.id === input.id)
        if (index === -1)
          throw new ApiError('This greyhound could not be found.', 'NOT_FOUND')
        if (
          records().some(
            (application) =>
              application.assignment?.greyhoundId === input.id,
          )
        )
          throw new ApiError(
            'Assigned greyhounds cannot be edited from the management list.',
            'ASSIGNED',
          )
        items[index] = {
          ...items[index],
          name,
          age: input.age,
          sex: input.sex,
          status: input.status,
        }
        save(GREYHOUNDS_KEY, items)
        return items[index]
      }
      const nextNumber =
        Math.max(
          1000,
          ...items.map(
            (greyhound) =>
              Number(greyhound.id.replace(/\D/g, '')) || 0,
          ),
        ) + 1
      const next: Greyhound = {
        id: `GH-${nextNumber}`,
        name,
        age: input.age,
        sex: input.sex,
        status: input.status,
      }
      save(GREYHOUNDS_KEY, [...items, next])
      return next
    },
    async dashboard() {
      await pause()
      requireStaff()
      const items = records()
      const now = clock()
      return {
        ...dashboardSummary(items, now),
        recent: filter(items).slice(0, 5),
        next: filter(
          items.filter(
            (a) => a.status === 'pending' || a.status === 'in_review',
          ),
          { sort: 'oldest' },
        )[0]?.id,
        now,
      }
    },
    async report(range: ReportRange = '30d'): Promise<ReportingData> {
      await pause()
      requireStaff()
      const all = records()
      const now = clock()
      const periodDays = range === '7d' ? 7 : 30
      const currentStart = new Date(now)
      currentStart.setHours(0, 0, 0, 0)
      if (range !== 'all')
        currentStart.setDate(currentStart.getDate() - (periodDays - 1))
      const previousStart = new Date(currentStart)
      previousStart.setDate(previousStart.getDate() - periodDays)
      const withinCurrent = (value: string) =>
        range === 'all' ||
        (new Date(value) >= currentStart && new Date(value) <= now)
      const withinPrevious = (value: string) =>
        new Date(value) >= previousStart && new Date(value) < currentStart
      const decisionRecords = all.flatMap((application) => {
        const activity = [...application.history]
          .reverse()
          .find((item) => isClosed(item.status))
        return activity ? [{ application, activity }] : []
      })
      const currentApplications = all.filter((application) =>
        withinCurrent(application.submittedAt),
      )
      const currentDecisions = decisionRecords.filter((record) =>
        withinCurrent(record.activity.at),
      )
      const previousDecisions = decisionRecords.filter((record) =>
        withinPrevious(record.activity.at),
      )
      const calculatePerformance = (
        decisions: typeof currentDecisions,
      ) => {
        const approved = decisions.filter(
          (record) => record.activity.status === 'approved',
        )
        const reviewDays = decisions.map(({ application, activity }) =>
          Math.max(
            0,
            (new Date(activity.at).getTime() -
              new Date(application.submittedAt).getTime()) /
              86_400_000,
          ),
        )
        return {
          decisions: decisions.length,
          approvalRate: decisions.length
            ? Math.round((approved.length / decisions.length) * 100)
            : null,
          assignmentRate: approved.length
            ? Math.round(
                (approved.filter((record) => record.application.assignment)
                  .length /
                  approved.length) *
                  100,
              )
            : null,
          averageReviewDays: reviewDays.length
            ? Math.round(
                (reviewDays.reduce((total, days) => total + days, 0) /
                  reviewDays.length) *
                  10,
              ) / 10
            : null,
        }
      }
      const workflow = [
        { label: 'Submitted', count: currentApplications.length },
        {
          label: 'Review started',
          count: currentApplications.filter(
            (application) => application.history.length > 1,
          ).length,
        },
        {
          label: 'Decision recorded',
          count: currentApplications.filter((application) =>
            isClosed(application.status),
          ).length,
        },
        {
          label: 'Greyhound assigned',
          count: currentApplications.filter(
            (application) => application.assignment,
          ).length,
        },
      ]
      const dayLabel = new Intl.DateTimeFormat('en-AU', { weekday: 'short' })
      const shortLabel = new Intl.DateTimeFormat('en-AU', {
        day: 'numeric',
        month: 'short',
      })
      const monthLabel = new Intl.DateTimeFormat('en-AU', {
        month: 'short',
        year: 'numeric',
      })
      let decisionTrend: ReportingData['decisionTrend']
      if (range === 'all') {
        const months = new Map<string, number>()
        decisionRecords.forEach((record) => {
          const date = new Date(record.activity.at)
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          months.set(key, (months.get(key) || 0) + 1)
        })
        decisionTrend = [...months.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, count]) => ({
            label: monthLabel.format(new Date(`${key}-01T00:00:00`)),
            count,
          }))
        if (!decisionTrend.length)
          decisionTrend = [{ label: monthLabel.format(now), count: 0 }]
      } else {
        const bucketLength = range === '7d' ? 1 : 7
        const bucketCount = range === '7d' ? 7 : 5
        decisionTrend = Array.from({ length: bucketCount }, (_, index) => {
          const start = new Date(currentStart)
          start.setDate(start.getDate() + index * bucketLength)
          const end = new Date(start)
          end.setDate(end.getDate() + bucketLength)
          return {
            label:
              range === '7d'
                ? dayLabel.format(start)
                : shortLabel.format(start),
            count: currentDecisions.filter((record) => {
              const date = new Date(record.activity.at)
              return date >= start && date < end && date <= now
            }).length,
          }
        })
      }
      return {
        range,
        performance: calculatePerformance(currentDecisions),
        previousPerformance:
          range === 'all' ? null : calculatePerformance(previousDecisions),
        decisionTrend,
        workflow,
        applicationTypes: ['Adoption', 'Foster'].map((label) => ({
          label,
          count: currentApplications.filter(
            (application) => application.form.applicationType === label,
          ).length,
        })),
      }
    },
    async decide(
      id: string,
      decision: Decision,
      note: string,
      revision: number,
    ) {
      await pause()
      const user = requireStaff()
      const items = records()
      const index = items.findIndex((a) => a.id === id)
      if (index === -1)
        throw new ApiError('This application could not be found.', 'NOT_FOUND')
      const current = items[index]
      if (current.revision !== revision)
        throw new ApiError(
          'This application has changed. Refresh it before making a decision.',
          'CONFLICT',
        )
      if (isClosed(current.status))
        throw new ApiError(
          'A final decision has already been recorded for this application.',
          'CLOSED',
        )
      const allowed: Record<Decision, Status[]> = {
        approved: ['pending', 'in_review', 'more_information'],
        rejected: ['pending', 'in_review', 'more_information'],
        more_information: ['pending', 'in_review'],
        in_review: ['pending', 'more_information'],
      }
      if (!allowed[decision]?.includes(current.status))
        throw new ApiError(
          'This action is no longer available. Refresh the application.',
          'INVALID_TRANSITION',
        )
      const text = note.trim()
      if (
        ['rejected', 'more_information'].includes(decision) &&
        text.length < 10
      )
        throw new ApiError(
          'Enter at least 10 characters so the reason is clear.',
          'VALIDATION',
        )
      if (text.length > 2000)
        throw new ApiError(
          'Keep the note within 2,000 characters.',
          'VALIDATION',
        )
      const now = clock().toISOString()
      const next = {
        ...current,
        status: decision,
        updatedAt: now,
        revision: revision + 1,
        history: [
          ...current.history,
          {
            id: `${id}-${revision + 1}`,
            at: now,
            status: decision,
            author: user.name,
            note:
              text ||
              (decision === 'approved'
                ? 'Application approved.'
                : 'Review started.'),
          },
        ],
      }
      items[index] = next
      save(STORAGE_KEY, items)
      return next
    },
    async assignGreyhound(
      applicationId: string,
      greyhoundId: string,
      revision: number,
    ) {
      await pause()
      const user = requireStaff()
      const items = records()
      const index = items.findIndex((application) => application.id === applicationId)
      if (index === -1)
        throw new ApiError('This application could not be found.', 'NOT_FOUND')
      const current = items[index]
      if (current.revision !== revision)
        throw new ApiError(
          'This application has changed. Refresh it before assigning a greyhound.',
          'CONFLICT',
        )
      if (current.status !== 'approved')
        throw new ApiError(
          'A greyhound can only be assigned to an approved application.',
          'NOT_APPROVED',
        )
      if (current.assignment)
        throw new ApiError(
          'A greyhound has already been assigned to this application.',
          'ALREADY_ASSIGNED',
        )
      const greyhound = greyhoundRecords().find(
        (candidate) => candidate.id === greyhoundId,
      )
      if (!greyhound)
        throw new ApiError('This greyhound could not be found.', 'NOT_FOUND')
      const alreadyAssigned = items.some(
        (application) => application.assignment?.greyhoundId === greyhoundId,
      )
      if (greyhound.status !== 'available' || alreadyAssigned)
        throw new ApiError(
          'This greyhound is no longer available. Choose another greyhound.',
          'NOT_AVAILABLE',
        )
      const now = clock().toISOString()
      const assignment = {
        greyhoundId: greyhound.id,
        name: greyhound.name,
        age: greyhound.age,
        sex: greyhound.sex,
        assignedAt: now,
        assignedBy: user.name,
      }
      const next: Application = {
        ...current,
        assignment,
        updatedAt: now,
        revision: revision + 1,
        history: [
          ...current.history,
          {
            id: `${applicationId}-assignment-${revision + 1}`,
            at: now,
            status: 'approved',
            author: user.name,
            label: 'Greyhound assigned',
            note: `${greyhound.name} was assigned to ${current.form.fullName}.`,
          },
        ],
      }
      items[index] = next
      save(STORAGE_KEY, items)
      return next
    },
  }
}
export const staffApi = createStaffApi({
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
})
export type DashboardData = Awaited<ReturnType<typeof staffApi.dashboard>>
