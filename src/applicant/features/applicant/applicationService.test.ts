import { webcrypto } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'

import { createEmptyApplicationForm } from './applicationModel'
import { applicationService } from './applicationService'

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

describe('mock application service', () => {
  it('creates and lists a draft for the current applicant', async () => {
    const draft = await applicationService.saveDraft({
      applicantId: 'applicant-1',
      currentStep: 1,
      form: createEmptyApplicationForm(),
    })
    const applications = await applicationService.list('applicant-1')

    expect(draft.status).toBe('draft')
    expect(applications).toHaveLength(1)
    expect(applications[0].id).toBe(draft.id)
  })

  it('submits an existing draft without creating a duplicate', async () => {
    const draft = await applicationService.saveDraft({
      applicantId: 'applicant-1',
      currentStep: 2,
      form: createEmptyApplicationForm(),
    })
    const submitted = await applicationService.submit({ ...draft })
    const applications = await applicationService.list('applicant-1')

    expect(submitted.status).toBe('submitted')
    expect(submitted.submittedAt).toBeTruthy()
    expect(applications).toHaveLength(1)
  })

  it('does not return another applicant’s records', async () => {
    await applicationService.saveDraft({
      applicantId: 'applicant-1',
      currentStep: 0,
      form: createEmptyApplicationForm(),
    })

    await expect(applicationService.list('applicant-2')).resolves.toEqual([])
  })
})
