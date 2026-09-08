import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gaps-staff-api-'))
process.env.GAPS_DB_FILE = path.join(tempDir, 'test.sqlite')
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-staff-tests'
process.env.NODE_ENV = 'test'

const { createApp } = await import('../app.js')
const { closeDatabase, getDatabase } = await import('../database/db.js')

let server, baseUrl, staffToken, applicantToken, applicationId, reviewApplicationId, greyhoundId

async function request(method, route, body, token = staffToken) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}

before(async () => {
  server = createApp().listen(0)
  baseUrl = `http://127.0.0.1:${server.address().port}`

  await request('POST', '/api/auth/register', { fullName: 'Jamie Staff', email: 'staff@example.com', password: 'safe-password' }, undefined)
  const db = getDatabase()
  const staff = db.prepare('SELECT id FROM users WHERE email=?').get('staff@example.com')
  db.prepare("UPDATE users SET role_id='staff' WHERE id=?").run(staff.id)
  db.prepare('INSERT INTO staff_profiles (user_id, full_name, job_title) VALUES (?,?,?)').run(staff.id, 'Jamie Staff', 'Adoption Coordinator')
  staffToken = (await request('POST', '/api/auth/login', { email: 'staff@example.com', password: 'safe-password' }, undefined)).body.token

  await request('POST', '/api/auth/register', { fullName: 'Alex Applicant', email: 'alex@example.com', password: 'safe-password' }, undefined)
  applicantToken = (await request('POST', '/api/auth/login', { email: 'alex@example.com', password: 'safe-password' }, undefined)).body.token
  const applicant = db.prepare('SELECT id FROM applicants WHERE user_id=(SELECT id FROM users WHERE email=?)').get('alex@example.com')
  const created = await request('POST', '/api/applications', { currentStep: 5, termsAccepted: true, privacyConsent: true, previousDogExperience: 'Experienced dog carer', reasonForApplying: 'Ready to foster a greyhound', emergencyContactName: 'Sam', emergencyContactPhone: '0400000000' }, applicantToken)
  applicationId = created.body.application.id
  await request('POST', `/api/applications/${applicationId}/submit`, undefined, applicantToken)
  db.prepare("UPDATE foster_applications SET application_status='approved' WHERE id=?").run(applicationId)
  const review = await request('POST', '/api/applications', { currentStep: 5, termsAccepted: true, privacyConsent: true, reasonForApplying: 'Second application for review', emergencyContactName: 'Taylor', emergencyContactPhone: '0411111111' }, applicantToken)
  reviewApplicationId = review.body.application.id
  await request('POST', `/api/applications/${reviewApplicationId}/submit`, undefined, applicantToken)
  greyhoundId = 'greyhound-bluey'
  db.prepare(`INSERT INTO greyhounds (id, greyhound_identifier, name, sex, age_years, colour, current_location, availability_status) VALUES (?,?,?,?,?,?,?,'available')`).run(greyhoundId, 'GAP-001', 'Bluey', 'male', 4, 'Blue', 'Sydney')
  assert.ok(applicant.id)
})

after(() => { server.close(); closeDatabase(); fs.rmSync(tempDir, { recursive: true, force: true }) })

describe('DEL-55 staff portal integration API', () => {
  it('blocks applicants from staff endpoints', async () => {
    const response = await request('GET', '/api/staff/applications', undefined, applicantToken)
    assert.equal(response.status, 403)
  })

  it('lists, searches and reads applications using the frontend model', async () => {
    const list = await request('GET', '/api/staff/applications?q=alex')
    assert.equal(list.status, 200)
    assert.equal(list.body.applications.length, 2)
    assert.equal(list.body.applications[0].form.fullName, 'Alex Applicant')
    const detail = await request('GET', `/api/staff/applications/${applicationId}`)
    assert.equal(detail.body.application.status, 'approved')
    assert.equal(detail.body.application.revision, 0)
  })

  it('records a staff decision and rejects a stale revision', async () => {
    const updated = await request('PATCH', `/api/staff/applications/${reviewApplicationId}/decision`, { decision: 'in_review', note: 'Review started.', revision: 0 })
    assert.equal(updated.status, 200)
    assert.equal(updated.body.application.status, 'in_review')
    assert.equal(updated.body.application.revision, 1)
    const stale = await request('PATCH', `/api/staff/applications/${reviewApplicationId}/decision`, { decision: 'approved', note: '', revision: 0 })
    assert.equal(stale.status, 409)
    assert.equal(stale.body.error.code, 'CONFLICT')
  })
})

describe('DEL-54 greyhound assignment API', () => {
  it('lists available greyhounds and creates an allocation', async () => {
    const available = await request('GET', '/api/staff/greyhounds')
    assert.equal(available.body.greyhounds[0].name, 'Bluey')
    const response = await request('POST', '/api/staff/allocations', {
      applicationId, greyhoundId, status: 'confirmed', expectedStartDate: '2026-09-12', expectedEndDate: '2026-10-12', notes: 'Suitable household and placement dates confirmed.',
    })
    assert.equal(response.status, 201)
    assert.equal(response.body.allocation.greyhound_name, 'Bluey')
    assert.equal(getDatabase().prepare('SELECT availability_status FROM greyhounds WHERE id=?').get(greyhoundId).availability_status, 'pending_allocation')
  })

  it('prevents a second active allocation for the same greyhound', async () => {
    const response = await request('POST', '/api/staff/allocations', { applicationId, greyhoundId, status: 'active' })
    assert.equal(response.status, 409)
    assert.equal(response.body.error.code, 'GREYHOUND_UNAVAILABLE')
  })

  it('records allocation audit evidence', () => {
    const audit = getDatabase().prepare("SELECT action FROM audit_logs WHERE entity_type='greyhound_allocation'").get()
    assert.equal(audit.action, 'greyhound.allocated')
  })
})
