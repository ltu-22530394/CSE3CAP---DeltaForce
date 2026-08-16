import type {
  ApplicantUser,
  AuthSession,
  LoginCredentials,
  RegistrationDetails,
} from './authTypes'

const MOCK_USERS_KEY = 'gap.mock.applicant-users'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '')
const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false' || !apiBaseUrl
const registerPath = import.meta.env.VITE_AUTH_REGISTER_PATH || '/auth/register'
const loginPath = import.meta.env.VITE_AUTH_LOGIN_PATH || '/auth/login'

interface MockUser extends ApplicantUser {
  passwordHash: string
}

interface AuthService {
  register(details: RegistrationDetails): Promise<ApplicantUser>
  login(credentials: LoginCredentials): Promise<AuthSession>
}

function serviceError(message: string, code: string): Error & { code: string } {
  const error = new Error(message)
  return Object.assign(error, { code })
}

function readMockUsers(): MockUser[] {
  try {
    return JSON.parse(window.localStorage.getItem(MOCK_USERS_KEY) || '[]') as MockUser[]
  } catch {
    return []
  }
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

function applicantId(): string {
  return window.crypto.randomUUID?.() ?? `applicant-${Date.now()}`
}

async function requestJson<T>(
  path: string,
  options: RequestInit,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const body = (await response.json().catch(() => ({}))) as T & { message?: string }

  if (!response.ok) {
    throw serviceError(body.message || 'The request could not be completed.', 'API_ERROR')
  }

  return body
}

const mockAuthService: AuthService = {
  async register({ fullName, email, password }: RegistrationDetails) {
    const users = readMockUsers()
    const normalizedEmail = email.trim().toLowerCase()

    if (users.some((user) => user.email === normalizedEmail)) {
      throw serviceError('An account already exists for this email.', 'EMAIL_EXISTS')
    }

    const user = {
      id: applicantId(),
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
    }
    window.localStorage.setItem(MOCK_USERS_KEY, JSON.stringify([...users, user]))

    return { id: user.id, fullName: user.fullName, email: user.email }
  },

  async login({ email, password }: LoginCredentials) {
    const normalizedEmail = email.trim().toLowerCase()
    const passwordHash = await hashPassword(password)
    const user = readMockUsers().find(
      (candidate) =>
        candidate.email === normalizedEmail && candidate.passwordHash === passwordHash,
    )

    if (!user) {
      throw serviceError('Email or password is incorrect.', 'INVALID_CREDENTIALS')
    }

    return {
      token: `mock-session-${applicantId()}`,
      user: { id: user.id, fullName: user.fullName, email: user.email },
    }
  },
}

const httpAuthService: AuthService = {
  register(details: RegistrationDetails) {
    return requestJson<ApplicantUser>(registerPath, {
      method: 'POST',
      body: JSON.stringify({
        fullName: details.fullName.trim(),
        email: details.email.trim().toLowerCase(),
        password: details.password,
      }),
    })
  },

  async login(credentials: LoginCredentials) {
    const response = await requestJson<Partial<AuthSession>>(loginPath, {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      }),
    })

    if (!response.token || !response.user) {
      throw serviceError('The login response is missing session data.', 'INVALID_RESPONSE')
    }
    return { token: response.token, user: response.user }
  },
}

export const authService: AuthService = useMockApi ? mockAuthService : httpAuthService
