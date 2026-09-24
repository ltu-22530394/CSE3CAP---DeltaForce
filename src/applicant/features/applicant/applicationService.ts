import { getStoredSession } from '../auth/authSession'
import type { Application } from '../../../api/model'
import type {
  ApplicationStatus,
  ApplicationWriteInput,
  StoredApplication,
} from './applicationModel'

const MOCK_APPLICATIONS_KEY = 'gap.mock.applications'

export interface ApplicationService {
  list(applicantId: string): Promise<StoredApplication[]>
  get(applicationId: string, applicantId: string): Promise<StoredApplication>
  saveDraft(application: ApplicationWriteInput): Promise<StoredApplication>
  submit(application: ApplicationWriteInput): Promise<StoredApplication>
}

function serviceError(message: string, code: string): Error & { code: string } {
  const error = new Error(message)
  return Object.assign(error, { code })
}

function readMockApplications(): StoredApplication[] {
  const applications = JSON.parse(
    window.localStorage.getItem(MOCK_APPLICATIONS_KEY) || '[]',
  ) as StoredApplication[]
  const reviews = JSON.parse(
    window.localStorage.getItem('gap.staff.records.v1') || '[]',
  ) as Application[]
  if (!Array.isArray(applications) || !Array.isArray(reviews))
    throw serviceError(
      'Saved application data could not be opened.',
      'STORAGE_ERROR',
    )
  return applications.map((application) => {
    const review = reviews.find((item) => item.id === application.id)
    return review && application.status !== 'draft'
      ? {
          ...application,
          status: review.status === 'pending' ? 'submitted' : review.status,
          updatedAt: review.updatedAt,
          reviewNote: review.history.at(-1)?.note,
        }
      : application
  })
}

function writeMockApplications(applications: StoredApplication[]): void {
  window.localStorage.setItem(
    MOCK_APPLICATIONS_KEY,
    JSON.stringify(applications),
  )
}

function applicationId(): string {
  return window.crypto.randomUUID?.() ?? `application-${Date.now()}`
}

function newestFirst(applications: StoredApplication[]): StoredApplication[] {
  return [...applications].sort(
    (first, second) =>
      new Date(second.updatedAt).getTime() -
      new Date(first.updatedAt).getTime(),
  )
}

function upsertMockApplication({
  id,
  applicantId,
  currentStep,
  form,
  status,
}: ApplicationWriteInput & { status: ApplicationStatus }): StoredApplication {
  const applications = readMockApplications()
  const existingIndex = id
    ? applications.findIndex((application) => application.id === id)
    : -1
  const existing = existingIndex >= 0 ? applications[existingIndex] : null

  if (existing && existing.applicantId !== applicantId) {
    throw serviceError('Application access is not permitted.', 'FORBIDDEN')
  }

  if (id && !existing)
    throw serviceError('Application could not be found.', 'NOT_FOUND')
  if (existing && existing.status !== 'draft')
    throw serviceError('Submitted applications are read-only.', 'READ_ONLY')

  const now = new Date().toISOString()
  const application: StoredApplication = {
    id: existing?.id ?? applicationId(),
    applicantId,
    status,
    currentStep,
    form,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    submittedAt: status === 'submitted' ? (existing?.submittedAt ?? now) : null,
  }

  if (existingIndex >= 0) {
    applications[existingIndex] = application
  } else {
    applications.push(application)
  }
  writeMockApplications(applications)
  return application
}

const mockApplicationService: ApplicationService = {
  async list(applicantId: string) {
    return newestFirst(
      readMockApplications().filter(
        (application) => application.applicantId === applicantId,
      ),
    )
  },

  async get(applicationIdValue: string, applicantId: string) {
    const application = readMockApplications().find(
      (candidate) =>
        candidate.id === applicationIdValue &&
        candidate.applicantId === applicantId,
    )
    if (!application) {
      throw serviceError('Application could not be found.', 'NOT_FOUND')
    }
    return application
  },

  async saveDraft(application: ApplicationWriteInput) {
    return upsertMockApplication({ ...application, status: 'draft' })
  },

  async submit(application: ApplicationWriteInput) {
    return upsertMockApplication({
      ...application,
      status: 'submitted',
      currentStep: 3,
    })
  },
}

export function createApiApplicationService(baseUrl: string): ApplicationService {
  async function request(path: string, input?: unknown) {
    const session = getStoredSession()
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/portal/applications${path}`, { method: input ? 'POST' : 'GET', headers: { 'content-type': 'application/json', authorization: `Bearer ${session?.token || ''}` }, body: input ? JSON.stringify(input) : undefined })
    const result = await response.json()
    if (!response.ok) throw serviceError(result.error?.message || 'Request failed.', result.error?.code || 'REQUEST_FAILED')
    return result
  }
  return {
    async list() { return (await request('')).applications },
    async get(id) { return (await request(`/${encodeURIComponent(id)}`)).application },
    async saveDraft(input) { return (await request('', { ...input, submit: false })).application },
    async submit(input) { return (await request('', { ...input, currentStep: 3, submit: true })).application },
  }
}
export const applicationService = import.meta.env.VITE_API_URL ? createApiApplicationService(import.meta.env.VITE_API_URL) : mockApplicationService
