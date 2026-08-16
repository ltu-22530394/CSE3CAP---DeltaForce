import { getStoredSession } from '../auth/authSession'
import type {
  ApplicationStatus,
  ApplicationWriteInput,
  StoredApplication,
} from './applicationModel'

const MOCK_APPLICATIONS_KEY = 'gap.mock.applications'
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '')
const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false' || !apiBaseUrl
const applicationsPath = import.meta.env.VITE_APPLICATIONS_PATH || '/applications'

interface ApplicationService {
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
  try {
    return JSON.parse(
      window.localStorage.getItem(MOCK_APPLICATIONS_KEY) || '[]',
    ) as StoredApplication[]
  } catch {
    return []
  }
}

function writeMockApplications(applications: StoredApplication[]): void {
  window.localStorage.setItem(MOCK_APPLICATIONS_KEY, JSON.stringify(applications))
}

function applicationId(): string {
  return window.crypto.randomUUID?.() ?? `application-${Date.now()}`
}

function newestFirst(applications: StoredApplication[]): StoredApplication[] {
  return [...applications].sort(
    (first, second) =>
      new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime(),
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

  const now = new Date().toISOString()
  const application: StoredApplication = {
    id: existing?.id ?? applicationId(),
    applicantId,
    status,
    currentStep,
    form,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    submittedAt: status === 'submitted' ? existing?.submittedAt ?? now : null,
  }

  if (existingIndex >= 0) {
    applications[existingIndex] = application
  } else {
    applications.push(application)
  }
  writeMockApplications(applications)
  return application
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredSession()?.token
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  const body = (await response.json().catch(() => ({}))) as T & { message?: string }

  if (!response.ok) {
    throw serviceError(body.message || 'The request could not be completed.', 'API_ERROR')
  }
  return body
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
        candidate.id === applicationIdValue && candidate.applicantId === applicantId,
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

const httpApplicationService: ApplicationService = {
  list(_applicantId: string) {
    return requestJson<StoredApplication[]>(applicationsPath)
  },

  get(applicationIdValue: string, _applicantId: string) {
    return requestJson<StoredApplication>(`${applicationsPath}/${applicationIdValue}`)
  },

  saveDraft(application: ApplicationWriteInput) {
    const path = application.id
      ? `${applicationsPath}/${application.id}`
      : applicationsPath
    return requestJson<StoredApplication>(path, {
      method: application.id ? 'PUT' : 'POST',
      body: JSON.stringify({
        currentStep: application.currentStep,
        status: 'draft',
        form: application.form,
      }),
    })
  },

  submit(application: ApplicationWriteInput) {
    const path = application.id
      ? `${applicationsPath}/${application.id}`
      : applicationsPath
    return requestJson<StoredApplication>(path, {
      method: application.id ? 'PUT' : 'POST',
      body: JSON.stringify({
        currentStep: 3,
        status: 'submitted',
        form: application.form,
      }),
    })
  },
}

export const applicationService: ApplicationService = useMockApi
  ? mockApplicationService
  : httpApplicationService
