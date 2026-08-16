import { webcrypto } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'

import { authService } from './authService'

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
      authService.login({ email: 'missing@example.com', password: 'incorrect' }),
    ).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
    })
  })
})
