import assert from 'node:assert/strict'
import { before, after, describe, it } from 'node:test'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gap-business-'))
process.env.GAPS_DB_FILE = path.join(tempDir, 'integration.sqlite')
process.env.JWT_SECRET =
  'integration-test-secret-longer-than-thirty-two-characters'
process.env.NODE_ENV = 'test'
process.env.EMAIL_MODE = 'preview'
const { createApp } = await import('../app.js')
const { getDatabase, closeDatabase } = await import('../database/db.js')
const { createAccessToken } = await import('../utils/jwt.js')
const { findPublicUserById } =
  await import('../repositories/userRepository.js')
let server,
  base,
  staffToken,
  regularStaffToken,
  applicantToken,
  secondToken,
  applicationId,
  secondId,
  dogId
const form = {
  fullName: 'Taylor Foster',
  dateOfBirth: '1990-04-12',
  email: 'taylor@example.com',
  phone: '0412345678',
  address: '10 Sample Street',
  suburb: 'Sydney',
  state: 'NSW',
  postcode: '2000',
  residenceType: 'house',
  housingStatus: 'owner',
  landlordPermission: '',
  adultsInHome: '2',
  childrenInHome: '0',
  secureYard: 'yes',
  applicationType: 'foster',
  dogExperience: 'Five years caring for dogs',
  greyhoundExperience: 'no',
  hasCurrentPets: 'no',
  currentPetsDetails: '',
  preferredFosteringPeriod: 'Four weeks',
  availability: 'Every weekday',
  transportAvailability: 'yes',
  reasonForApplying: 'Provide a calm home for a greyhound',
  emergencyContactName: 'Sam Foster',
  emergencyContactPhone: '0412345679',
  confirmAccurate: true,
  termsAccepted: true,
  privacyConsent: true,
}
async function request(method, route, body, token) {
  const response = await fetch(base + route, {
    method,
    headers: {
      ...(body !== undefined
        ? { 'content-type': 'application/json' }
        : {}),
      ...(token ? { authorization: 'Bearer ' + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  return {
    status: response.status,
    body: response.headers.get('content-type')?.includes('json')
      ? JSON.parse(text)
      : text,
  }
}
function staff(role = 'admin') {
  const id = randomUUID(),
    db = getDatabase()
  db.prepare(
    "INSERT INTO users (id, email, password_hash, role_id, email_verified_at) VALUES (?, ?, ?, ?, datetime('now'))",
  ).run(
    id,
    id + '@gap.test',
    bcrypt.hashSync('StaffPassword123!', 4),
    role,
  )
  db.prepare(
    'INSERT INTO staff_profiles (id, user_id, full_name) VALUES (?, ?, ?)',
  ).run(randomUUID(), id, role + ' staff')
  return createAccessToken(findPublicUserById(id))
}
before(() => {
  server = createApp().listen(0)
  base = `http://127.0.0.1:${server.address().port}`
  staffToken = staff()
  regularStaffToken = staff('staff')
})
after(async () => {
  await new Promise((resolve) => server.close(resolve))
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe('connected foster business workflow', () => {
  it('rejects passwords that would be silently truncated by bcrypt', async () => {
    const result = await request('POST', '/api/portal/apply', {
      form,
      password: 'A'.repeat(73),
    })
    assert.equal(result.status, 400)
    assert.equal(
      getDatabase().prepare('SELECT count(*) AS n FROM applicants').get()
        .n,
      0,
    )
  })
  it('rejects incomplete public applications without creating an account', async () => {
    const result = await request('POST', '/api/portal/apply', {
      form: { ...form, postcode: '', privacyConsent: false },
      password: 'Password123!',
    })
    assert.equal(result.status, 400)
    assert.equal(
      getDatabase().prepare('SELECT count(*) AS n FROM applicants').get()
        .n,
      0,
    )
  })
  it('creates application, account, audit entries and notification history atomically', async () => {
    const result = await request('POST', '/api/portal/apply', {
      form,
      password: 'Password123!',
    })
    assert.equal(result.status, 201)
    applicationId = result.body.applicationId
    assert.equal(result.body.verificationUrl, undefined)
    assert.equal(
      getDatabase()
        .prepare('SELECT count(*) AS n FROM portal_application_state')
        .get().n,
      1,
    )
    assert.equal(
      getDatabase()
        .prepare('SELECT count(*) AS n FROM notifications')
        .get().n,
      1,
    )
    const login = await request('POST', '/api/auth/login', {
      email: form.email,
      password: 'Password123!',
    })
    assert.equal(login.status, 200)
    applicantToken = login.body.token
  })
  it('blocks duplicate accounts and keeps one application', async () => {
    assert.equal(
      (
        await request('POST', '/api/portal/apply', {
          form,
          password: 'Password123!',
        })
      ).status,
      409,
    )
    assert.equal(
      getDatabase()
        .prepare('SELECT count(*) AS n FROM portal_application_state')
        .get().n,
      1,
    )
  })
  it('uses backend role and ownership rules for resources and staff access', async () => {
    assert.equal(
      (
        await request(
          'GET',
          '/api/portal/resources',
          undefined,
          applicantToken,
        )
      ).status,
      403,
    )
    assert.equal(
      (
        await request(
          'GET',
          '/api/portal/staff/applications',
          undefined,
          applicantToken,
        )
      ).status,
      403,
    )
    assert.equal(
      (await request('GET', '/api/portal/staff/applications')).status,
      401,
    )
    const register = await request('POST', '/api/portal/apply', {
      form: {
        ...form,
        fullName: 'Second Foster',
        email: 'second@example.com',
      },
      password: 'Password123!',
    })
    secondId = register.body.applicationId
    secondToken = (
      await request('POST', '/api/auth/login', {
        email: 'second@example.com',
        password: 'Password123!',
      })
    ).body.token
    assert.equal(
      (
        await request(
          'GET',
          '/api/portal/applications/' + applicationId,
          undefined,
          secondToken,
        )
      ).status,
      404,
    )
  })
  it('records a private staff note without exposing it to the applicant', async () => {
    const reviewed = await request(
      'POST',
      `/api/portal/staff/applications/${applicationId}/decision`,
      {
        decision: 'in_review',
        note: 'Private suitability discussion',
        revision: 0,
      },
      staffToken,
    )
    assert.equal(reviewed.status, 200)
    assert.equal(
      reviewed.body.application.history.at(-1).note,
      'Private suitability discussion',
    )
    assert.equal(
      (
        await request(
          'GET',
          '/api/portal/applications/' + applicationId,
          undefined,
          applicantToken,
        )
      ).body.application.reviewNote,
      undefined,
    )
  })
  it('allows information requests and applicant responses without reopening the protected form', async () => {
    assert.equal(
      (
        await request(
          'POST',
          `/api/portal/staff/applications/${applicationId}/decision`,
          {
            decision: 'more_information',
            note: 'Please confirm fence height.',
            revision: 1,
          },
          staffToken,
        )
      ).status,
      200,
    )
    const own = await request(
      'GET',
      '/api/portal/applications/' + applicationId,
      undefined,
      applicantToken,
    )
    assert.equal(
      own.body.application.reviewNote,
      'Please confirm fence height.',
    )
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/applications',
          { id: applicationId, form, currentStep: 3 },
          applicantToken,
        )
      ).status,
      409,
    )
    const response = await request(
      'POST',
      `/api/portal/applications/${applicationId}/information`,
      { text: 'The secure fence is 1.8 metres tall.' },
      applicantToken,
    )
    assert.equal(response.body.application.status, 'in_review')
  })
  it('rejects allocation before approval and grants resources on approval', async () => {
    const unavailable = await request(
      'POST',
      `/api/portal/staff/applications/${secondId}/allocation`,
      { greyhoundId: 'unknown', revision: 0 },
      staffToken,
    )
    assert.equal(unavailable.body.error.code, 'NOT_APPROVED')
    assert.equal(
      (
        await request(
          'POST',
          `/api/portal/staff/applications/${applicationId}/decision`,
          { decision: 'approved', revision: 3 },
          staffToken,
        )
      ).status,
      200,
    )
    assert.equal(
      (await request('GET', '/api/auth/me', undefined, applicantToken))
        .body.user.role,
      'foster_carer',
    )
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/staff/resources',
          {
            title: 'Approved foster guide',
            url: 'https://example.com/guide.pdf',
            type: 'pdf',
          },
          regularStaffToken,
        )
      ).status,
      403,
    )
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/staff/resources',
          {
            title: 'Approved foster guide',
            url: 'https://example.com/guide.pdf',
            type: 'pdf',
          },
          staffToken,
        )
      ).status,
      200,
    )
    assert.equal(
      (
        await request(
          'GET',
          '/api/portal/resources',
          undefined,
          applicantToken,
        )
      ).body.resources.length,
      1,
    )
    assert.equal(
      (
        await request(
          'GET',
          '/api/portal/resources',
          undefined,
          secondToken,
        )
      ).status,
      403,
    )
  })
  it('validates CSV columns and previews without changing records', async () => {
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/staff/import',
          { fileName: 'dogs.csv', text: 'name,age\nBuddy,3' },
          staffToken,
        )
      ).body.error.code,
      'MISSING_COLUMNS',
    )
    const text =
      'id,name,age,sex,careInstructions,salesforceId\nGH-1,Buddy,3,Male,Feed twice daily,SF-1\nGH-2,Invalid,wrong,Female,,\nGH-1,Duplicate,3,Male,,'
    const preview = await request(
      'POST',
      '/api/portal/staff/import',
      { fileName: 'dogs.csv', text },
      staffToken,
    )
    assert.equal(preview.body.successful, 1)
    assert.equal(preview.body.failed, 2)
    assert.equal(
      getDatabase().prepare('SELECT count(*) AS n FROM greyhounds').get()
        .n,
      0,
    )
    const imported = await request(
      'POST',
      '/api/portal/staff/import',
      { fileName: 'dogs.csv', text, confirm: true },
      staffToken,
    )
    assert.equal(imported.body.successful, 1)
    const errors = await request(
      'GET',
      `/api/portal/staff/import/${imported.body.batchId}/errors.csv`,
      undefined,
      staffToken,
    )
    assert.ok(errors.body.includes('Row'))
    dogId = (
      await request(
        'GET',
        '/api/portal/staff/greyhounds',
        undefined,
        staffToken,
      )
    ).body.greyhounds[0].id
  })
  it('requires explicit overwrite for duplicate imported dogs', async () => {
    const input = {
      fileName: 'update.csv',
      text: 'id,name,age,sex\nGH-1,Buddy Updated,4,Male',
      confirm: true,
    }
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/staff/import',
          input,
          staffToken,
        )
      ).body.skipped,
      1,
    )
    assert.equal(
      (
        await request(
          'GET',
          '/api/portal/staff/greyhounds',
          undefined,
          staffToken,
        )
      ).body.greyhounds[0].name,
      'Buddy',
    )
  })
  it('allocates one dog once and reveals only the owner care details', async () => {
    assert.equal(
      (
        await request(
          'POST',
          `/api/portal/staff/applications/${applicationId}/allocation`,
          { greyhoundId: dogId, revision: 4 },
          staffToken,
        )
      ).status,
      200,
    )
    assert.equal(
      (
        await request(
          'POST',
          `/api/portal/staff/applications/${secondId}/decision`,
          { decision: 'approved', revision: 0 },
          staffToken,
        )
      ).status,
      200,
    )
    assert.equal(
      (
        await request(
          'POST',
          `/api/portal/staff/applications/${secondId}/allocation`,
          { greyhoundId: dogId, revision: 1 },
          staffToken,
        )
      ).body.error.code,
      'NOT_AVAILABLE',
    )
    const own = (
      await request(
        'GET',
        '/api/portal/applications/' + applicationId,
        undefined,
        applicantToken,
      )
    ).body.application
    assert.equal(own.assignment.name, 'Buddy')
    assert.equal(own.assignment.careInstructions, 'Feed twice daily')
    assert.equal(own.assignment.assignedBy, undefined)
    assert.equal(own.assignment.salesforceId, undefined)
    assert.equal(
      (
        await request(
          'GET',
          '/api/portal/applications/' + secondId,
          undefined,
          secondToken,
        )
      ).body.application.assignment,
      undefined,
    )
  })
  it('keeps historical allocation records when a placement ends', async () => {
    assert.equal(
      (
        await request(
          'POST',
          `/api/portal/staff/applications/${applicationId}/allocation/end`,
          { status: 'completed', revision: 5 },
          staffToken,
        )
      ).status,
      200,
    )
    assert.equal(
      (
        await request(
          'GET',
          '/api/portal/applications/' + applicationId,
          undefined,
          applicantToken,
        )
      ).body.application.assignment,
      undefined,
    )
    assert.equal(
      (
        await request(
          'GET',
          `/api/portal/staff/applications/${applicationId}/allocations`,
          undefined,
          staffToken,
        )
      ).body.allocations[0].status,
      'completed',
    )
    assert.equal(
      (
        await request(
          'GET',
          '/api/portal/staff/greyhounds',
          undefined,
          staffToken,
        )
      ).body.greyhounds[0].status,
      'available',
    )
  })
  it('exports filtered reports and records exports in the audit log', async () => {
    const report = await request(
      'GET',
      '/api/portal/staff/reports.csv?status=approved',
      undefined,
      staffToken,
    )
    assert.equal(report.status, 200)
    assert.ok(report.body.includes('Taylor Foster'))
    assert.ok(report.body.includes('Greyhound ID'))
    const audit = await request(
      'GET',
      '/api/portal/staff/audit',
      undefined,
      staffToken,
    )
    assert.ok(
      audit.body.audit.some((item) => item.action === 'report.exported'),
    )
    assert.equal(
      (
        await request(
          'GET',
          '/api/portal/staff/audit',
          undefined,
          applicantToken,
        )
      ).status,
      403,
    )
    const emails = await request(
      'GET',
      '/api/portal/staff/notifications',
      undefined,
      staffToken,
    )
    assert.ok(
      emails.body.notifications.some(
        (item) => item.subject === 'Foster application approved',
      ),
    )
    assert.ok(
      emails.body.notifications.every((item) => item.status === 'stored'),
    )
  })
  it('keeps integrated drafts private and locks their submitted answers', async () => {
    const draft = await request(
      'POST',
      '/api/portal/applications',
      { form, currentStep: 1 },
      applicantToken,
    )
    assert.equal(draft.status, 201)
    assert.equal(draft.body.application.status, 'draft')
    const id = draft.body.application.id
    const staffList = await request(
      'GET',
      '/api/portal/staff/applications',
      undefined,
      staffToken,
    )
    assert.ok(!staffList.body.applications.some((item) => item.id === id))
    const submitted = await request(
      'POST',
      '/api/portal/applications',
      { id, form, currentStep: 3, submit: true },
      applicantToken,
    )
    assert.equal(submitted.body.application.status, 'submitted')
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/applications',
          { id, form, currentStep: 2 },
          applicantToken,
        )
      ).status,
      409,
    )
    assert.equal(
      (
        await request(
          'GET',
          '/api/portal/staff/applications/' + id,
          undefined,
          staffToken,
        )
      ).status,
      200,
    )
  })
  it('requires an administrator to reset passwords and revokes existing sessions', async () => {
    const user = getDatabase()
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(form.email)
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/admin/users',
          {
            id: user.id,
            password: 'ChangedPassword123!',
          },
          staffToken,
        )
      ).status,
      200,
    )
    assert.equal(
      (
        await request('POST', '/api/auth/reset-password', {
          email: form.email,
          password: 'ChangedAgain123!',
        })
      ).status,
      410,
    )
    assert.equal(
      (await request('GET', '/api/auth/me', undefined, applicantToken))
        .status,
      401,
    )
    assert.equal(
      (
        await request('POST', '/api/auth/login', {
          email: form.email,
          password: 'Password123!',
        })
      ).status,
      401,
    )
    const login = await request('POST', '/api/auth/login', {
      email: form.email,
      password: 'ChangedPassword123!',
    })
    assert.equal(login.status, 200)
    applicantToken = login.body.token
  })
  it('removes Microsoft endpoints and retains actionable Salesforce errors', async () => {
    assert.equal(
      (await request('GET', '/api/auth/microsoft/start')).status,
      404,
    )
    assert.equal(
      (await request('GET', '/api/auth/microsoft/callback?state=invalid'))
        .status,
      404,
    )
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/staff/salesforce/preview',
          {},
          staffToken,
        )
      ).body.error.code,
      'SALESFORCE_NOT_CONFIGURED',
    )
  })
  it('revokes sessions at logout and enforces inactivity expiry', async () => {
    assert.equal(
      (await request('POST', '/api/auth/logout', {}, secondToken)).status,
      204,
    )
    assert.equal(
      (await request('GET', '/api/auth/me', undefined, secondToken))
        .status,
      401,
    )
    getDatabase()
      .prepare('UPDATE auth_sessions SET last_seen_at = ?')
      .run(Date.now() - 31 * 60 * 1000)
    assert.equal(
      (await request('GET', '/api/auth/me', undefined, applicantToken))
        .status,
      401,
    )
  })
})
