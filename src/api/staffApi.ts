import type { StoredApplication } from '../applicant/features/applicant/applicationModel'
import { dashboardSummary, isClosed, statusLabels } from './model'
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
const HTTP_SESSION_KEY = 'gap.staff.http-session.v1'

export function createHttpStaffApi(baseUrl: string, storage: DataStore) {
  const root = baseUrl.replace(/\/$/, '')
  function readSession(): { token: string; user: StaffUser } | null {
    try {
      const value = storage.getItem(HTTP_SESSION_KEY)
      return value ? JSON.parse(value) : null
    } catch {
      return null
    }
  }
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const current = readSession()
    const response = await fetch(`${root}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(current ? { authorization: `Bearer ${current.token}` } : {}),
        ...init.headers,
      },
    })
    const body = response.status === 204 ? null : await response.json()
    if (!response.ok) {
      const code = body?.error?.code || 'REQUEST_FAILED'
      throw new ApiError(
        body?.error?.message || 'The server could not complete this request.',
        response.status === 401 ? 'UNAUTHENTICATED' : code,
      )
    }
    return body as T
  }
  type IntegratedApplication = {
    id: string
    applicantName: string
    email: string
    phone?: string
    location?: { addressLine1?: string; addressLine2?: string; suburb?: string; state?: string; postcode?: string }
    status: string
    applicationType?: string
    submittedAt?: string
    updatedAt?: string
    decisionAt?: string
    rejectionReason?: string
    staffNotes?: string
    details?: Record<string, unknown>
  }
  const statusMap: Record<string, Status> = {
    submitted: 'pending', under_review: 'in_review', information_required: 'more_information',
    approved: 'approved', rejected: 'rejected',
  }
  function mapApplication(value: IntegratedApplication): Application {
    const details = value.details || {}
    const status = statusMap[value.status] || 'pending'
    const at = value.submittedAt || value.updatedAt || new Date().toISOString()
    const finalNote = value.rejectionReason || value.staffNotes
    return {
      id: value.id,
      status,
      form: {
        fullName: value.applicantName, dateOfBirth: '', email: value.email, phone: value.phone || '',
        address: [value.location?.addressLine1, value.location?.addressLine2, value.location?.suburb, value.location?.state, value.location?.postcode].filter(Boolean).join(', '),
        residenceType: String(details.householdType || ''), housingStatus: String(details.housingStatus || ''),
        landlordPermission: details.landlordApproval ? 'Yes' : 'No', adultsInHome: String(details.adultsInHome ?? ''),
        childrenInHome: String(details.childrenInHome ?? ''), secureYard: String(details.yardOrOutdoorArea || ''),
        applicationType: value.applicationType === 'adoption' ? 'Adoption' : 'Foster',
        dogExperience: String(details.previousDogExperience || ''), greyhoundExperience: String(details.previousGreyhoundExperience || ''),
        hasCurrentPets: details.existingPets ? 'Yes' : 'No', currentPetsDetails: String(details.existingPets || ''),
        confirmAccurate: Boolean(details.termsAccepted && details.privacyConsent),
      },
      submittedAt: at, updatedAt: value.updatedAt || value.decisionAt || at, revision: 0,
      history: [
        { id: `${value.id}-submitted`, at, status: 'pending', author: value.applicantName, note: 'Application submitted.' },
        ...(status !== 'pending' ? [{ id: `${value.id}-${status}`, at: value.decisionAt || value.updatedAt || at, status, author: 'GAP staff', note: finalNote || `Application ${statusLabels[status].toLowerCase()}.` }] : []),
      ],
    }
  }
  const list = async (filters: Filters = {}) => {
    const query = new URLSearchParams()
    if (filters.q) query.set('search', filters.q)
    if (filters.sort) query.set('sort', filters.sort)
    if (filters.status && filters.status !== 'in_progress') {
      query.set('status', ({ pending: 'submitted', in_review: 'under_review', more_information: 'information_required' } as Record<string, string>)[filters.status] || filters.status)
    }
    query.set('limit', '100')
    const body = await request<{ applications: IntegratedApplication[] }>(`/api/staff/applications?${query}`)
    return body.applications.map(mapApplication).filter((application) =>
      (!filters.type || application.form.applicationType === filters.type) &&
      (filters.status !== 'in_progress' || ['in_review', 'more_information'].includes(application.status)))
  }
  return {
    session: () => readSession()?.user || null,
    async login(email: string, password: string) {
      const body = await request<{ token: string; user: { id: string; fullName: string; role: string; email: string } }>('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      })
      if (!['staff', 'admin'].includes(body.user.role)) throw new ApiError('Staff access is required.', 'FORBIDDEN')
      const user = { id: body.user.id, name: body.user.fullName, role: body.user.role, email: body.user.email }
      storage.setItem(HTTP_SESSION_KEY, JSON.stringify({ token: body.token, user }))
      return user
    },
    logout() { storage.setItem(HTTP_SESSION_KEY, '') },
    list,
    async get(id: string) {
      const body = await request<{ application: IntegratedApplication }>(`/api/staff/applications/${encodeURIComponent(id)}`)
      return mapApplication(body.application)
    },
    async dashboard() {
      const items = await list()
      const now = new Date()
      const ordered = [...items].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      return {
        ...dashboardSummary(items, now), recent: ordered.slice(0, 5),
        next: [...items].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)).find((a) => a.status === 'pending' || a.status === 'in_review')?.id,
        now,
      }
    },
    async decide(id: string, decision: Decision, note: string, revision: number) {
      const path = decision === 'approved' ? 'approve' : decision === 'rejected' ? 'reject' : 'decision'
      const body = await request<{ application: IntegratedApplication | Application }>(`/api/staff/applications/${encodeURIComponent(id)}/${path}`, {
        method: path === 'decision' ? 'PATCH' : 'POST', body: JSON.stringify({ decision, note, revision }),
      })
      return 'form' in body.application ? body.application : mapApplication(body.application)
    },
  }
}

const browserStorage: DataStore = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
}
export const staffApi = import.meta.env.VITE_API_URL
  ? createHttpStaffApi(import.meta.env.VITE_API_URL, browserStorage)
  : createStaffApi(browserStorage)
export type DashboardData = Awaited<ReturnType<typeof staffApi.dashboard>>
