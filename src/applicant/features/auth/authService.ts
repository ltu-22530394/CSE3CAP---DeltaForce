import { staffUser } from '../../../api/seed'
import bcrypt from 'bcryptjs'
import type {
  ApplicantUser,
  AuthSession,
  LoginCredentials,
  RegistrationDetails,
} from './authTypes'

const MOCK_USERS_KEY = 'gap.mock.applicant-users'

interface MockUser extends ApplicantUser {
  passwordHash: string
}

export interface AuthService {
  register(details: RegistrationDetails): Promise<ApplicantUser>
  login(credentials: LoginCredentials): Promise<AuthSession>
}

function serviceError(message: string, code: string): Error & { code: string } {
  const error = new Error(message)
  return Object.assign(error, { code })
}

function readMockUsers(): MockUser[] {
  try {
    return JSON.parse(
      window.localStorage.getItem(MOCK_USERS_KEY) || '[]',
    ) as MockUser[]
  } catch {
    return []
  }
}

function applicantId(): string {
  return window.crypto.randomUUID?.() ?? `applicant-${Date.now()}`
}

export function createMockAuthService(): AuthService {
  return {
  async register({ fullName, email, password }: RegistrationDetails) {
    const users = readMockUsers()
    const normalizedEmail = email.trim().toLowerCase()

    if (
      normalizedEmail === staffUser.email ||
      users.some((user) => user.email === normalizedEmail)
    ) {
      throw serviceError(
        'An account already exists for this email.',
        'EMAIL_EXISTS',
      )
    }

    const user = {
      id: applicantId(),
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 10),
    }
    window.localStorage.setItem(
      MOCK_USERS_KEY,
      JSON.stringify([...users, user]),
    )

    return { id: user.id, fullName: user.fullName, email: user.email }
  },

  async login({ email, password }: LoginCredentials) {
    const normalizedEmail = email.trim().toLowerCase()
    const users = readMockUsers()
    const user = users.find((candidate) => candidate.email === normalizedEmail)

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw serviceError(
        'Email or password is incorrect.',
        'INVALID_CREDENTIALS',
      )
    }

    return {
      token: `mock-session-${applicantId()}`,
      user: { id: user.id, fullName: user.fullName, email: user.email },
    }
  },
  }
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export function createApiAuthService(baseUrl: string, fetcher: Fetcher = fetch): AuthService {
  const root = baseUrl.replace(/\/$/, '')
  async function request<T>(path: string, body: unknown): Promise<T> {
    let response: Response
    try {
      response = await fetcher(`${root}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      throw serviceError('The authentication service is unavailable. Please try again.', 'SERVICE_UNAVAILABLE')
    }
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw serviceError(data?.error?.message || 'Authentication failed. Please try again.', data?.error?.code || 'REQUEST_FAILED')
    }
    return data as T
  }
  return {
    async register(details) {
      const result = await request<{ user: ApplicantUser }>('/api/auth/register', details)
      return result.user
    },
    async login(credentials) {
      return request<AuthSession>('/api/auth/login', credentials)
    },
  }
}

export const authService: AuthService = import.meta.env.VITE_API_URL
  ? createApiAuthService(import.meta.env.VITE_API_URL)
  : createMockAuthService()
