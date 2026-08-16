import type { AuthSession } from './authTypes'

const SESSION_KEY = 'gap.applicant.session'

function parseJson<T>(value: string | null, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

export function getStoredSession(): AuthSession | null {
  return parseJson(window.localStorage.getItem(SESSION_KEY), null)
}

export function saveStoredSession(session: AuthSession): void {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearStoredSession(): void {
  window.localStorage.removeItem(SESSION_KEY)
}
