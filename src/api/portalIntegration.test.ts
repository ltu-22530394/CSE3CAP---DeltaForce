import { webcrypto } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStaffApi } from './staffApi'
import { samplePassword, staffUser } from './seed'
import { authService } from '../applicant/features/auth/authService'
import { applicationService } from '../applicant/features/applicant/applicationService'
import { createEmptyApplicationForm } from '../applicant/features/applicant/applicationModel'
const values = new Map<string, string>()
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    values.set(key, value)
  },
  removeItem: (key: string) => {
    values.delete(key)
  },
}
beforeEach(() => {
  values.clear()
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: storage, crypto: webcrypto },
  })
})
describe('connected applicant and staff workflows', () => {
  it('requires staff login on a fresh visit and reserves staff accounts from public registration', async () => {
    const staff = createStaffApi(storage, 0)
    expect(staff.session()).toBeNull()
    await expect(staff.list()).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
    await expect(
      authService.register({
        fullName: 'Applicant',
        email: staffUser.email,
        password: 'password123',
      }),
    ).rejects.toMatchObject({ code: 'EMAIL_EXISTS' })
  })
  it('connects registration, applicant login, draft, submission, review and applicant status', async () => {
    const user = await authService.register({
      fullName: 'Taylor Applicant',
      email: 'taylor@example.com',
      password: 'password123',
    })
    const session = await authService.login({
      email: user.email,
      password: 'password123',
    })
    expect(session.user.id).toBe(user.id)
    const form = {
      ...createEmptyApplicationForm(user),
      applicationType: 'foster',
    }
    const draft = await applicationService.saveDraft({
      applicantId: user.id,
      currentStep: 1,
      form,
    })
    const staff = createStaffApi(storage, 0)
    await staff.login(staffUser.email, samplePassword)
    expect(await staff.list()).toHaveLength(48)
    await applicationService.submit({ ...draft })
    const record = await staff.get(draft.id)
    expect(record.form.applicationType).toBe('Foster')
    expect(record.status).toBe('pending')
    expect(await staff.list()).toHaveLength(49)
    expect(await staff.list()).toHaveLength(49)
    await staff.decide(
      record.id,
      'approved',
      'Ready for the next steps.',
      record.revision,
    )
    const result = await applicationService.get(draft.id, user.id)
    expect(result.status).toBe('approved')
    expect(result.reviewNote).toBe('Ready for the next steps.')
    await expect(
      applicationService.saveDraft({ ...result }),
    ).rejects.toMatchObject({ code: 'READ_ONLY' })
    await expect(
      applicationService.get(draft.id, 'another-user'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect((await staff.dashboard()).approved).toBe(27)
  })
  it('shows information requests to the applicant without permitting decision overwrite', async () => {
    const submitted = await applicationService.submit({
      applicantId: 'test-user',
      currentStep: 3,
      form: {
        ...createEmptyApplicationForm(),
        fullName: 'Morgan Applicant',
        applicationType: 'adoption',
      },
    })
    const staff = createStaffApi(storage, 0)
    await staff.login(staffUser.email, samplePassword)
    const record = await staff.get(submitted.id)
    await staff.decide(
      record.id,
      'more_information',
      'Please confirm your landlord permission.',
      record.revision,
    )
    const applicantRecord = await applicationService.get(
      submitted.id,
      'test-user',
    )
    expect(applicantRecord.status).toBe('more_information')
    expect(applicantRecord.reviewNote).toContain('landlord permission')
    await expect(
      applicationService.submit({ ...applicantRecord }),
    ).rejects.toMatchObject({ code: 'READ_ONLY' })
  })
})
