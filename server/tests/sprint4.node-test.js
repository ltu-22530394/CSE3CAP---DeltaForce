import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gap-sprint4-'))
process.env.GAPS_DB_FILE = path.join(dir, 'test.sqlite')
process.env.JWT_SECRET = 'sprint4-isolated-test-key'
process.env.REQUIRE_EMAIL_VERIFICATION = 'true'
process.env.PASSWORD_SALT_ROUNDS = '4'
process.env.NODE_ENV = 'test'
const { createApp } = await import('../app.js')
const { getDatabase, closeDatabase } = await import('../database/db.js')
const { deliverPendingMail } = await import('../services/mail.js')
const { hashPassword } = await import('../utils/password.js')
let server, base, token, staff, appId, dogId, verifyToken, resetToken
const delivered = []
const transport = {
  async sendMail(mail) {
    delivered.push(mail)
  },
}
async function req(method, url, body, auth = token) {
  const r = await fetch(base + url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(auth ? { authorization: `Bearer ${auth}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: r.status, body: await r.json().catch(() => null) }
}
function linkToken(type) {
  return delivered
    .filter((m) => m.subject.includes(type))
    .at(-1)
    .text.match(/token=([a-f0-9]{64})/)[1]
}
const form = {
  fullName: 'Test Applicant',
  dateOfBirth: '1995-01-01',
  email: 'applicant@example.test',
  phone: '0400000000',
  address: '42 Sample Street, Sydney NSW 2000',
  residenceType: 'house',
  housingStatus: 'owner',
  landlordPermission: 'not-applicable',
  adultsInHome: '2',
  childrenInHome: '0',
  secureYard: 'yes',
  applicationType: 'foster',
  dogExperience: 'Experienced with dogs',
  greyhoundExperience: 'no',
  hasCurrentPets: 'no',
  currentPetsDetails: '',
  confirmAccurate: true,
}
before(async () => {
  server = createApp().listen(0)
  base = `http://127.0.0.1:${server.address().port}`
  getDatabase()
    .prepare(
      "INSERT INTO users (id,email,password_hash,role_id) VALUES ('staff','staff@example.test',?,'staff')",
    )
    .run(await hashPassword('password123'))
  staff = (
    await req(
      'POST',
      '/api/auth/login',
      { email: 'staff@example.test', password: 'password123' },
      null,
    )
  ).body.token
})
after(() => {
  server.close()
  closeDatabase()
  fs.rmSync(dir, { recursive: true, force: true })
})
test('verification gates login, stores only hashed tokens, and cannot be replayed', async () => {
  const r = await req(
    'POST',
    '/api/auth/register',
    { fullName: 'Test Applicant', email: form.email, password: 'password123' },
    null,
  )
  assert.equal(r.status, 201)
  assert.equal(r.body.user.emailVerified, false)
  assert.equal(
    (
      await req(
        'POST',
        '/api/auth/login',
        { email: form.email, password: 'password123' },
        null,
      )
    ).status,
    403,
  )
  await deliverPendingMail(transport)
  verifyToken = linkToken('Verify')
  assert.notEqual(
    getDatabase()
      .prepare('SELECT token_hash FROM email_verification_tokens')
      .get().token_hash,
    verifyToken,
  )
  assert.equal(
    (await req('POST', '/api/auth/verify-email', { token: verifyToken }, null))
      .status,
    200,
  )
  assert.equal(
    (await req('POST', '/api/auth/verify-email', { token: verifyToken }, null))
      .status,
    400,
  )
  token = (
    await req(
      'POST',
      '/api/auth/login',
      { email: form.email, password: 'password123' },
      null,
    )
  ).body.token
  assert.ok(token)
})
test('applicant persists draft, rejects bad address, submits once and queues one receipt', async () => {
  let r = await req('POST', '/api/portal/applications', {
    form,
    currentStep: 0,
    submit: false,
  })
  assert.equal(r.status, 200)
  appId = r.body.application.id
  assert.equal(
    (await req('GET', `/api/portal/applications/${appId}`)).body.application
      .form.address,
    form.address,
  )
  r = await req('POST', '/api/portal/applications', {
    id: appId,
    form: { ...form, address: '1234' },
    currentStep: 3,
    submit: true,
  })
  assert.equal(r.status, 400)
  r = await req('POST', '/api/portal/applications', {
    id: appId,
    form,
    currentStep: 3,
    submit: true,
  })
  assert.equal(r.status, 200)
  assert.equal(
    (
      await req('POST', '/api/portal/applications', {
        id: appId,
        form,
        currentStep: 3,
        submit: true,
      })
    ).status,
    409,
  )
  assert.equal(
    (
      await req('POST', '/api/portal/applications', {
        form,
        currentStep: 3,
        submit: true,
      })
    ).status,
    409,
  )
  assert.equal(
    getDatabase()
      .prepare(
        "SELECT count(*) n FROM notifications WHERE notification_type='application_confirmation'",
      )
      .get().n,
    1,
  )
})
test('CSV import validates rows, handles quoting and duplicates, persists error evidence and blocks applicants', async () => {
  const input = {
    fileName: 'test.csv',
    csv: 'identifier,name,age,sex,status\nGAP-1,"Bluey, Junior",4,Male,available\nGAP-2,Luna,3,Female,medical_hold\nGAP-1,Duplicate,4,Male,available\nGAP-3,Bad,abc,Male,available',
  }
  assert.equal(
    (await req('POST', '/api/staff/greyhounds/import', input)).status,
    403,
  )
  let r = await req('POST', '/api/staff/greyhounds/import', input, staff)
  assert.equal(r.status, 200)
  assert.equal(r.body.inserted, 2)
  assert.equal(r.body.duplicates, 1)
  assert.equal(r.body.errors.length, 2)
  assert.equal(
    getDatabase()
      .prepare('SELECT count(*) n FROM greyhound_import_errors')
      .get().n,
    2,
  )
  r = await req('POST', '/api/staff/greyhounds/import', input, staff)
  assert.equal(r.body.inserted, 0)
  assert.equal(r.body.duplicates, 3)
  r = await req(
    'POST',
    '/api/staff/greyhounds/import',
    { csv: 'wrong,columns\na,b' },
    staff,
  )
  assert.equal(r.body.inserted, 0)
  assert.ok(r.body.errors.length)
  const dogs = (await req('GET', '/api/staff/greyhound-records', null, staff))
    .body.greyhounds
  dogId = dogs.find((d) => d.name === 'Bluey, Junior').id
  assert.equal(dogs.find((d) => d.name === 'Luna').status, 'medical_hold')
})
test('staff sees applicant data, preserves information-request history and rejects stale decisions', async () => {
  let r = await req(
    'GET',
    `/api/staff/portal/applications/${appId}`,
    null,
    staff,
  )
  assert.equal(r.body.application.form.address, form.address)
  assert.ok(r.body.application.updatedAt)
  assert.ok(new Date(r.body.application.updatedAt).getFullYear() >= 2026)
  r = await req(
    'PATCH',
    `/api/staff/applications/${appId}/decision`,
    {
      decision: 'more_information',
      note: 'Please provide landlord permission.',
      revision: 0,
    },
    staff,
  )
  assert.equal(r.status, 200)
  r = await req(
    'PATCH',
    `/api/staff/applications/${appId}/decision`,
    { decision: 'approved', note: '', revision: 0 },
    staff,
  )
  assert.equal(r.status, 409)
  r = await req(
    'PATCH',
    `/api/staff/applications/${appId}/decision`,
    { decision: 'approved', note: 'Approved after review.', revision: 1 },
    staff,
  )
  assert.equal(r.status, 200)
  assert.equal(r.body.application.history.length, 3)
  assert.ok(
    r.body.application.history.some(
      (h) => h.note === 'Please provide landlord permission.',
    ),
  )
  assert.equal(
    (await req('GET', `/api/portal/applications/${appId}`)).body.application
      .status,
    'approved',
  )
})
test('assignment is persisted, updates revision and prevents double assignment and held dogs', async () => {
  let r = await req(
    'POST',
    '/api/staff/allocations',
    {
      applicationId: appId,
      greyhoundId: dogId,
      status: 'confirmed',
      revision: 0,
    },
    staff,
  )
  assert.equal(r.status, 409)
  const held = (
    await req('GET', '/api/staff/greyhound-records', null, staff)
  ).body.greyhounds.find((d) => d.status === 'medical_hold')
  assert.equal(
    (
      await req(
        'POST',
        '/api/staff/allocations',
        { applicationId: appId, greyhoundId: held.id, revision: 2 },
        staff,
      )
    ).status,
    409,
  )
  r = await req(
    'POST',
    '/api/staff/allocations',
    {
      applicationId: appId,
      greyhoundId: dogId,
      status: 'confirmed',
      revision: 2,
    },
    staff,
  )
  assert.equal(r.status, 201)
  r = await req('GET', `/api/staff/portal/applications/${appId}`, null, staff)
  assert.equal(r.body.application.assignment.greyhoundId, dogId)
  assert.equal(r.body.application.revision, 3)
  const other = (
    await req(
      'POST',
      '/api/staff/greyhound-records',
      { name: 'Other', age: 4, sex: 'Male', status: 'available' },
      staff,
    )
  ).body.greyhound
  assert.equal(
    (
      await req(
        'POST',
        '/api/staff/allocations',
        { applicationId: appId, greyhoundId: other.id, revision: 3 },
        staff,
      )
    ).status,
    409,
  )
  assert.equal(
    (
      await req(
        'POST',
        '/api/staff/greyhound-records',
        {
          id: dogId,
          name: 'Changed',
          age: 4,
          sex: 'Male',
          status: 'available',
        },
        staff,
      )
    ).status,
    409,
  )
})
test('mail failures are recorded, retries succeed and sent mail is not resent', async () => {
  await deliverPendingMail({
    async sendMail() {
      throw new Error('private-provider-secret')
    },
  })
  const failed = getDatabase()
    .prepare("SELECT * FROM notifications WHERE delivery_status='failed'")
    .all()
  assert.ok(failed.length >= 3)
  assert.ok(
    failed.every((m) => !m.error_message.includes('private-provider-secret')),
  )
  getDatabase().exec('UPDATE notifications SET next_attempt_at=NULL')
  await deliverPendingMail(transport)
  const count = delivered.length
  await deliverPendingMail(transport)
  assert.equal(delivered.length, count)
  assert.equal(
    getDatabase()
      .prepare(
        "SELECT count(*) n FROM notifications WHERE delivery_status='sent' AND encrypted_body IS NOT NULL",
      )
      .get().n,
    0,
  )
})
test('reset responses do not enumerate users; reset expires, is single-use and invalidates sessions', async () => {
  const known = await req(
    'POST',
    '/api/auth/forgot-password',
    { email: form.email },
    null,
  )
  const unknown = await req(
    'POST',
    '/api/auth/forgot-password',
    { email: 'missing@example.test' },
    null,
  )
  assert.deepEqual(known, unknown)
  await deliverPendingMail(transport)
  resetToken = linkToken('Reset')
  getDatabase().exec("UPDATE password_reset_tokens SET expires_at='2000-01-01'")
  assert.equal(
    (
      await req(
        'POST',
        '/api/auth/reset-password',
        { token: resetToken, password: 'newpassword123' },
        null,
      )
    ).status,
    400,
  )
  getDatabase().exec("UPDATE password_reset_tokens SET expires_at='2099-01-01'")
  assert.equal(
    (
      await req(
        'POST',
        '/api/auth/reset-password',
        { token: resetToken, password: 'newpassword123' },
        null,
      )
    ).status,
    200,
  )
  assert.equal(
    (
      await req(
        'POST',
        '/api/auth/reset-password',
        { token: resetToken, password: 'otherpassword123' },
        null,
      )
    ).status,
    400,
  )
  assert.equal((await req('GET', '/api/portal/applications')).status, 401)
  assert.equal(
    (
      await req(
        'POST',
        '/api/auth/login',
        { email: form.email, password: 'password123' },
        null,
      )
    ).status,
    401,
  )
  assert.equal(
    (
      await req(
        'POST',
        '/api/auth/login',
        { email: form.email, password: 'newpassword123' },
        null,
      )
    ).status,
    200,
  )
})
