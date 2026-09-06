import type { StoredApplication } from '../applicant/features/applicant/applicationModel'
import { dashboardSummary, isClosed } from './model'
import type { Application, Decision, Filters, StaffUser, Status } from './model'
import { seedApplications, staffUser, samplePassword } from './seed'

export const STORAGE_KEY = 'gap.staff.records.v1'
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
  }
}
export const staffApi = createStaffApi({
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
})
export type DashboardData = Awaited<ReturnType<typeof staffApi.dashboard>>
