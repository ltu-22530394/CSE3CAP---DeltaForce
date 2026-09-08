import { webcrypto } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'

import { authService, createApiAuthService } from './authService'

class MemoryStorage implements Storage {
  #values = new Map<string, string>()

  get length(): number {
    return this.#values.size
  }

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, String(value))
  }

  removeItem(key: string): void {
    this.#values.delete(key)
  }

  clear(): void {
    this.#values.clear()
  }
  key(index: number): string | null {
    return [...this.#values.keys()][index] ?? null
  }
}

const localStorage = new MemoryStorage()

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { crypto: webcrypto, localStorage },
  })
})

describe('mock auth service', () => {
  it('registers an applicant and returns only public profile fields', async () => {
    const user = await authService.register({
      fullName: 'Taylor Applicant',
      email: 'TAYLOR@example.com',
      password: 'safe-password',
    })

    expect(user).toMatchObject({
      fullName: 'Taylor Applicant',
      email: 'taylor@example.com',
    })
    expect(user).not.toHaveProperty('passwordHash')
  })

  it('allows a registered applicant to log in', async () => {
    await authService.register({
      fullName: 'Taylor Applicant',
      email: 'taylor@example.com',
      password: 'safe-password',
    })

    const session = await authService.login({
      email: 'taylor@example.com',
      password: 'safe-password',
    })

    expect(session.token).toMatch(/^mock-session-/)
    expect(session.user.email).toBe('taylor@example.com')
  })

  it('returns a clear error for invalid credentials', async () => {
    await expect(
      authService.login({
        email: 'missing@example.com',
        password: 'incorrect',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
    })
  })

  it('works when Web Crypto subtle is unavailable', async () => {
    Object.defineProperty(window, 'crypto', {
      configurable: true,
      value: { randomUUID: () => 'fallback-id' },
    })
    await authService.register({ fullName: 'Fallback User', email: 'fallback@example.com', password: 'safe-password' })
    const session = await authService.login({ email: 'fallback@example.com', password: 'safe-password' })
    expect(session.user.email).toBe('fallback@example.com')
  })
})

describe('API auth service', () => {
  it('uses the backend registration and login contracts', async () => {
    const requests: Array<{ url: string; body: unknown }> = []
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(input), body: JSON.parse(String(init?.body)) })
      const login = String(input).endsWith('/login')
      return new Response(JSON.stringify(login
        ? { token: 'jwt-token', user: { id: 'applicant-1', fullName: 'API User', email: 'api@example.com' } }
        : { user: { id: 'applicant-1', fullName: 'API User', email: 'api@example.com' } }),
      { status: login ? 200 : 201, headers: { 'content-type': 'application/json' } })
    }
    const api = createApiAuthService('http://localhost:4000/', fetcher)
    await api.register({ fullName: 'API User', email: 'api@example.com', password: 'safe-password' })
    const session = await api.login({ email: 'api@example.com', password: 'safe-password' })
    expect(session.token).toBe('jwt-token')
    expect(requests.map((request) => request.url)).toEqual([
      'http://localhost:4000/api/auth/register',
      'http://localhost:4000/api/auth/login',
    ])
  })

  it('shows a useful error when the backend is unavailable', async () => {
    const api = createApiAuthService('http://localhost:4000', async () => { throw new Error('offline') })
    await expect(api.login({ email: 'api@example.com', password: 'safe-password' })).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      message: 'The authentication service is unavailable. Please try again.',
    })
  })
})
