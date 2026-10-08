import { apiRequest, apiSession, clearApiSession, saveApiSession } from './http'
import type { ApiSession } from './http'
import type {
  Application,
  Decision,
  Filters,
  Greyhound,
  GreyhoundFilters,
  GreyhoundInput,
  ReportRange,
  StaffUser,
} from './model'
import { dashboardSummary } from './model'
import { reportingData } from './reporting'

const query = (filters: object) =>
  new URLSearchParams(
    Object.entries(filters)
      .filter(([, value]) => value)
      .map(([key, value]) => [key, String(value)]),
  ).toString()
export const serverStaffApi = {
  session(): StaffUser | null {
    const user = apiSession()?.user
    return user && ['staff', 'admin'].includes(user.role)
      ? { id: user.id, name: user.fullName, email: user.email, role: user.role }
      : null
  },
  async login(email: string, password: string) {
    const session = await apiRequest<ApiSession>('/auth/login', {
      email,
      password,
    })
    if (!['staff', 'admin'].includes(session.user.role))
      throw new Error('A staff account is required.')
    saveApiSession(session)
    return this.session()!
  },
  logout() {
    void apiRequest('/auth/logout', {})
      .finally(clearApiSession)
      .catch(() => {})
    clearApiSession()
  },
  async list(filters: Filters = {}) {
    return (
      await apiRequest<{ applications: Application[] }>(
        '/portal/staff/applications?' + query(filters),
      )
    ).applications
  },
  async get(id: string) {
    return (
      await apiRequest<{ application: Application }>(
        '/portal/staff/applications/' + encodeURIComponent(id),
      )
    ).application
  },
  async listGreyhounds(filters: GreyhoundFilters = {}) {
    return (
      await apiRequest<{ greyhounds: Greyhound[] }>(
        '/portal/staff/greyhounds?' + query(filters),
      )
    ).greyhounds
  },
  async saveGreyhound(input: GreyhoundInput) {
    return (
      await apiRequest<{ greyhound: Greyhound }>(
        '/portal/staff/greyhounds',
        input,
      )
    ).greyhound
  },
  async decide(
    id: string,
    decision: Decision,
    note: string,
    revision: number,
    applicantVisible = false,
  ) {
    return (
      await apiRequest<{ application: Application }>(
        `/portal/staff/applications/${encodeURIComponent(id)}/decision`,
        { decision, note, revision, applicantVisible },
      )
    ).application
  },
  async assignGreyhound(
    applicationId: string,
    greyhoundId: string,
    revision: number,
    details: {startDate?:string;endDate?:string;note?:string} = {},
  ) {
    return (
      await apiRequest<{ application: Application }>(
        `/portal/staff/applications/${encodeURIComponent(applicationId)}/allocation`,
        { greyhoundId, revision, ...details },
      )
    ).application
  },
  async dashboard() {
    const applications = await this.list()
    const now = new Date()
    return {
      ...dashboardSummary(applications, now),
      recent: applications.slice(0, 5),
      next: [...applications]
        .reverse()
        .find((item) => ['pending', 'in_review'].includes(item.status))?.id,
      now,
    }
  },
  async report(range: ReportRange = '30d') {
    return reportingData(await this.list(), range)
  },
}
