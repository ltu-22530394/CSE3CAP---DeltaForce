import { describe, expect, it } from 'vitest'
import { createStaffApi, STORAGE_KEY, SESSION_KEY } from './staffApi'
import { seedApplications, samplePassword, staffUser } from './seed'
import { dashboardSummary, isClosed } from './model'
const now = new Date('2026-09-05T18:00:00')
function setup() {
  const values = new Map<string, string>([
    [SESSION_KEY, JSON.stringify(staffUser)],
  ])
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
  return { api: createStaffApi(storage, 0, () => now), values, storage }
}
describe('staff application workflow', () => {
  it('derives all overview values from the same persisted application set', async () => {
    const { api } = setup()
    const all = await api.list()
    const d = await api.dashboard()
    expect(all).toHaveLength(48)
    expect([d.pending, d.inProgress, d.approved, d.rejected]).toEqual([
      12, 7, 26, 3,
    ])
    expect(d.weeklyTotal).toBe(18)
    expect(d.completed).toBe(5)
    expect(d.days.map((day) => day.count)).toEqual([2, 4, 3, 5, 3, 1, 0])
    expect(d.percentages.reduce((a, b) => a + b, 0)).toBe(100)
    expect(d.recent.map((a) => a.form.fullName)).toEqual([
      'Olivia Bennett',
      'Daniel Cooper',
      'Priya Sharma',
      'Liam Wilson',
      'Sophie Taylor',
    ])
  })
  it('does not seed future submissions, including a Monday before office hours', () => {
    for (const value of [
      '2026-09-07T01:00:00',
      '2026-09-09T13:00:00',
      '2026-09-13T18:00:00',
    ]) {
      const clock = new Date(value),
        apps = seedApplications(clock),
        d = dashboardSummary(apps, clock)
      expect(apps.every((a) => new Date(a.submittedAt) <= clock)).toBe(true)
      expect(
        d.days.filter((day) => day.future).every((day) => day.count === 0),
      ).toBe(true)
    }
  })
  it('combines search, status and type filters and supports oldest first', async () => {
    const { api } = setup()
    const found = await api.list({
      q: 'OLIVIA',
      type: 'Adoption',
      status: 'pending',
    })
    expect(found).toHaveLength(1)
    expect(await api.list({ q: 'Olivia', type: 'Foster' })).toHaveLength(0)
    expect(await api.list({ status: 'in_progress' })).toHaveLength(7)
    const sorted = await api.list({ sort: 'oldest' })
    expect(sorted.map((a) => a.submittedAt)).toEqual(
      sorted.map((a) => a.submittedAt).sort(),
    )
    expect((await api.dashboard()).next).toBe(
      sorted.find((a) => a.status === 'pending' || a.status === 'in_review')!
        .id,
    )
  })
  it('persists approval, history and dashboard changes across API instances', async () => {
    const { api, storage } = setup()
    const a = (await api.list({ status: 'pending' }))[0]
    const next = await api.decide(
      a.id,
      'approved',
      'Suitable home and experience.',
      a.revision,
    )
    expect(next.history.at(-1)?.author).toBe('Jamie Morgan')
    expect(next.revision).toBe(2)
    const reloaded = createStaffApi(storage, 0, () => now)
    expect((await reloaded.get(a.id)).status).toBe('approved')
    const d = await reloaded.dashboard()
    expect([d.pending, d.approved, d.completed]).toEqual([11, 27, 6])
  })
  it('requires a meaningful reason for rejection and requests without changing the record', async () => {
    const { api } = setup()
    const a = (await api.list({ status: 'pending' }))[0]
    for (const action of ['rejected', 'more_information'] as const)
      await expect(
        api.decide(a.id, action, '   ', a.revision),
      ).rejects.toMatchObject({ code: 'VALIDATION' })
    expect((await api.get(a.id)).revision).toBe(1)
  })
  it('records a request, permits resuming review and keeps the entire history', async () => {
    const { api } = setup()
    let a = (await api.list({ status: 'pending' }))[0]
    a = await api.decide(
      a.id,
      'more_information',
      'Please provide your landlord permission.',
      a.revision,
    )
    expect((await api.dashboard()).inProgress).toBe(8)
    a = await api.decide(
      a.id,
      'in_review',
      'Additional information reviewed.',
      a.revision,
    )
    a = await api.decide(
      a.id,
      'rejected',
      'Permission was not granted by the landlord.',
      a.revision,
    )
    expect(a.history.map((h) => h.status)).toEqual([
      'pending',
      'more_information',
      'in_review',
      'rejected',
    ])
  })
  it('rejects duplicate or stale decisions and prevents changing final decisions', async () => {
    const { api } = setup()
    const a = (await api.list({ status: 'pending' }))[0]
    const results = await Promise.allSettled([
      api.decide(a.id, 'approved', '', a.revision),
      api.decide(a.id, 'rejected', 'Not suitable for placement.', a.revision),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const updated = await api.get(a.id)
    expect(isClosed(updated.status)).toBe(true)
    await expect(
      api.decide(a.id, 'in_review', '', updated.revision),
    ).rejects.toMatchObject({ code: 'CLOSED' })
  })
  it('returns a usable missing-record error', async () => {
    const { api } = setup()
    await expect(api.get('missing')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
  it('logs out persistently and requires a valid staff account before data access', async () => {
    const { api, storage } = setup()
    await api.list()
    api.logout()
    expect(api.session()).toBeNull()
    const next = createStaffApi(storage, 0, () => now)
    expect(next.session()).toBeNull()
    await expect(next.list()).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    await expect(next.login(staffUser.email, 'wrong')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    })
    await next.login(staffUser.email.toUpperCase(), samplePassword)
    expect(await next.list()).toHaveLength(48)
  })
  it('handles corrupt and unavailable storage without silently overwriting applications', async () => {
    const { api, values } = setup()
    values.set(STORAGE_KEY, '{invalid')
    await expect(api.list()).rejects.toMatchObject({ code: 'STORAGE_ERROR' })
    expect(values.get(STORAGE_KEY)).toBe('{invalid')
    const broken = createStaffApi(
      {
        getItem: (key) =>
          key === SESSION_KEY ? JSON.stringify(staffUser) : null,
        setItem: () => {
          throw new Error('Quota exceeded')
        },
      },
      0,
    )
    await expect(broken.list()).rejects.toMatchObject({ code: 'STORAGE_ERROR' })
  })
  it('leaves saved records unchanged when writing a decision fails', async () => {
    const { api, values, storage } = setup()
    const a = (await api.list({ status: 'pending' }))[0]
    const before = values.get(STORAGE_KEY)
    const broken = createStaffApi(
      {
        getItem: storage.getItem,
        setItem: () => {
          throw new Error('Quota')
        },
      },
      0,
      () => now,
    )
    await expect(
      broken.decide(a.id, 'approved', '', a.revision),
    ).rejects.toMatchObject({ code: 'STORAGE_ERROR' })
    expect(values.get(STORAGE_KEY)).toBe(before)
  })
  it('handles an empty workload without NaN values or a dead review link', async () => {
    const { api, values } = setup()
    values.set(STORAGE_KEY, '[]')
    const d = await api.dashboard()
    expect(d.percentages).toEqual([0, 0, 0])
    expect(d.next).toBeUndefined()
    expect(d.weeklyTotal).toBe(0)
  })
})
