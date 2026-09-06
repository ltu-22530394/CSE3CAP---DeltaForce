import { staffUser } from '../../../api/seed'
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

export const authService: AuthService = {
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
      passwordHash: await hashPassword(password),
    }
    window.localStorage.setItem(
      MOCK_USERS_KEY,
      JSON.stringify([...users, user]),
    )

    return { id: user.id, fullName: user.fullName, email: user.email }
  },

  async login({ email, password }: LoginCredentials) {
    const normalizedEmail = email.trim().toLowerCase()
    const passwordHash = await hashPassword(password)
    const user = readMockUsers().find(
      (candidate) =>
        candidate.email === normalizedEmail &&
        candidate.passwordHash === passwordHash,
    )

    if (!user) {
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
