import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gaps-staff-api-'))

process.env.GAPS_DB_FILE = path.join(tempDir, 'test.sqlite')
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-staff-api-tests'
process.env.JWT_EXPIRES_IN = '15m'
process.env.NODE_ENV = 'test'

const { createApp } = await import('../app.js')
const { closeDatabase, getDatabase } = await import('../database/db.js')
const { findPublicUserById } = await import('../repositories/userRepository.js')
const { createAccessToken } = await import('../utils/jwt.js')

let server
let baseUrl
let staffToken
let applicantToken

function tokenFor(userId) {
  return createAccessToken(findPublicUserById(userId))
}

function seedStaff() {
  const db = getDatabase()

  db.prepare(
    `
      INSERT INTO users (id, email, role_id, account_status)
      VALUES ('staff-user-1', 'staff@example.com', 'staff', 'active')
    `,
  ).run()

  db.prepare(
    `
      INSERT INTO staff_profiles (id, user_id, full_name, job_title)
      VALUES ('staff-profile-1', 'staff-user-1', 'Morgan Staff', 'Coordinator')
    `,
  ).run()
}

function seedApplication({
  id,
  applicantUserId,
  applicantId,
  firstName,
  lastName,
  email,
  phone,
  suburb,
  state,
  postcode,
  status,
  submittedAt,
  assignedStaffUserId = null,
  decisionAt = null,
  rejectionReason = null,
}) {
  const db = getDatabase()

  db.prepare(
    `
      INSERT INTO users (id, email, role_id, account_status)
      VALUES (?, ?, 'applicant', 'active')
    `,
  ).run(applicantUserId, email)

  db.prepare(
    `
      INSERT INTO applicants (
        id,
        user_id,
        first_name,
        last_name,
        phone,
        address_line_1,
        suburb,
        state,
        postcode
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    applicantId,
    applicantUserId,
    firstName,
    lastName,
    phone,
    `${postcode} Test Street`,
    suburb,
    state,
    postcode,
  )

  db.prepare(
    `
      INSERT INTO foster_applications (
        id,
        applicant_id,
        application_status,
        assigned_staff_user_id,
        submitted_at,
        decision_at,
        decided_by_user_id,
        rejection_reason,
        current_step
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 3)
    `,
  ).run(
    id,
    applicantId,
    status,
    assignedStaffUserId,
    submittedAt,
    decisionAt,
    decisionAt ? 'staff-user-1' : null,
    rejectionReason,
  )

  db.prepare(
    `
      INSERT INTO foster_application_details (
        application_id,
        household_type,
        housing_status,
        adults_in_home,
        children_in_home,
        previous_dog_experience,
        reason_for_applying,
        emergency_contact_name,
        emergency_contact_phone,
        terms_accepted,
        privacy_consent
      )
      VALUES (?, 'house', 'owner', 2, 0, ?, ?, 'Emergency Contact', '0400999888', 1, 1)
    `,
  ).run(
    id,
    `${firstName} has previous dog-care experience.`,
    `${firstName} wants to help foster greyhounds.`,
  )
}

function seedData() {
  seedStaff()

  seedApplication({
    id: 'APP-1001',
    applicantUserId: 'applicant-user-1',
    applicantId: 'applicant-1',
    firstName: 'Ana',
    lastName: 'Foster',
    email: 'ana.foster@example.com',
    phone: '0400 111 222',
    suburb: 'Sydney',
    state: 'NSW',
    postcode: '2000',
    status: 'submitted',
    submittedAt: '2026-09-01 09:00:00',
  })

  seedApplication({
    id: 'APP-1002',
    applicantUserId: 'applicant-user-2',
    applicantId: 'applicant-2',
    firstName: 'Liam',
    lastName: 'Review',
    email: 'liam.review@example.com',
    phone: '0400 333 444',
    suburb: 'Parramatta',
    state: 'NSW',
    postcode: '2150',
    status: 'under_review',
    submittedAt: '2026-09-03 10:30:00',
    assignedStaffUserId: 'staff-user-1',
  })

  seedApplication({
    id: 'APP-1003',
    applicantUserId: 'applicant-user-3',
    applicantId: 'applicant-3',
    firstName: 'Priya',
    lastName: 'Approved',
    email: 'priya.approved@example.com',
    phone: '0400 555 666',
    suburb: 'Melbourne',
    state: 'VIC',
    postcode: '3000',
    status: 'approved',
    submittedAt: '2026-09-04 11:15:00',
    assignedStaffUserId: 'staff-user-1',
    decisionAt: '2026-09-05 12:00:00',
  })

  seedApplication({
    id: 'APP-1004',
    applicantUserId: 'applicant-user-4',
    applicantId: 'applicant-4',
    firstName: 'Noah',
    lastName: 'Rejected',
    email: 'noah.rejected@example.com',
    phone: '0400 777 888',
    suburb: 'Newcastle',
    state: 'NSW',
    postcode: '2300',
    status: 'rejected',
    submittedAt: '2026-09-06 13:45:00',
    assignedStaffUserId: 'staff-user-1',
    decisionAt: '2026-09-07 09:00:00',
    rejectionReason: 'The application did not meet current foster requirements.',
  })

  seedApplication({
    id: 'APP-DRAFT',
    applicantUserId: 'applicant-user-draft',
    applicantId: 'applicant-draft',
    firstName: 'Hidden',
    lastName: 'Draft',
    email: 'hidden.draft@example.com',
    phone: '0400 999 000',
    suburb: 'Sydney',
    state: 'NSW',
    postcode: '2001',
    status: 'draft',
    submittedAt: null,
  })
}

async function apiRequest(method, route, body = undefined, token = staffToken) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  return {
    body: text ? JSON.parse(text) : null,
    status: response.status,
  }
}

function ids(response) {
  return response.body.applications.map((application) => application.id)
}

before(() => {
  const app = createApp()
  server = app.listen(0)
  baseUrl = `http://127.0.0.1:${server.address().port}`
  seedData()
  staffToken = tokenFor('staff-user-1')
  applicantToken = tokenFor('applicant-user-1')
})

after(() => {
  server.close()
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe('staff application API', () => {
  it('requires authenticated staff access', async () => {
    const missing = await apiRequest('GET', '/api/staff/applications', undefined, null)
    const applicant = await apiRequest(
      'GET',
      '/api/staff/applications',
      undefined,
      applicantToken,
    )

    assert.equal(missing.status, 401)
    assert.equal(missing.body.error.code, 'AUTH_REQUIRED')
    assert.equal(applicant.status, 403)
    assert.equal(applicant.body.error.code, 'FORBIDDEN')
  })

  it('searches, filters, sorts and paginates submitted applications', async () => {
    const all = await apiRequest('GET', '/api/staff/applications?limit=100')
    const byName = await apiRequest('GET', '/api/staff/applications?search=ana')
    const byEmail = await apiRequest(
      'GET',
      '/api/staff/applications?search=liam.review%40example.com',
    )
    const byId = await apiRequest('GET', '/api/staff/applications?search=1003')
    const byPhone = await apiRequest('GET', '/api/staff/applications?search=777')
    const byStatus = await apiRequest('GET', '/api/staff/applications?status=under_review')
    const byDate = await apiRequest(
      'GET',
      '/api/staff/applications?submittedFrom=2026-09-03&submittedTo=2026-09-04&sort=oldest',
    )
    const byLocation = await apiRequest('GET', '/api/staff/applications?location=parramatta')
    const byStaff = await apiRequest(
      'GET',
      '/api/staff/applications?assignedStaffUserId=staff-user-1&sort=oldest',
    )
    const pendingDecision = await apiRequest(
      'GET',
      '/api/staff/applications?approvalStatus=pending_decision&sort=oldest',
    )
    const decided = await apiRequest('GET', '/api/staff/applications?approvalStatus=decided')
    const approved = await apiRequest('GET', '/api/staff/applications?approvalStatus=approved')
    const paged = await apiRequest('GET', '/api/staff/applications?limit=2&offset=1&sort=oldest')

    assert.equal(all.status, 200)
    assert.equal(all.body.pagination.total, 4)
    assert.deepEqual(ids(byName), ['APP-1001'])
    assert.deepEqual(ids(byEmail), ['APP-1002'])
    assert.deepEqual(ids(byId), ['APP-1003'])
    assert.deepEqual(ids(byPhone), ['APP-1004'])
    assert.deepEqual(ids(byStatus), ['APP-1002'])
    assert.deepEqual(ids(byDate), ['APP-1002', 'APP-1003'])
    assert.deepEqual(ids(byLocation), ['APP-1002'])
    assert.deepEqual(ids(byStaff), ['APP-1002', 'APP-1003', 'APP-1004'])
    assert.deepEqual(ids(pendingDecision), ['APP-1001', 'APP-1002'])
    assert.deepEqual(new Set(ids(decided)), new Set(['APP-1003', 'APP-1004']))
    assert.deepEqual(ids(approved), ['APP-1003'])
    assert.deepEqual(ids(paged), ['APP-1002', 'APP-1003'])
  })

  it('rejects invalid search and filter values with useful API errors', async () => {
    const invalidStatus = await apiRequest(
      'GET',
      '/api/staff/applications?status=waiting-room',
    )
    const invalidDate = await apiRequest(
      'GET',
      '/api/staff/applications?submittedFrom=09-03-2026',
    )

    assert.equal(invalidStatus.status, 400)
    assert.equal(invalidStatus.body.error.code, 'INVALID_FILTER')
    assert.equal(invalidDate.status, 400)
    assert.equal(invalidDate.body.error.code, 'INVALID_FILTER')
  })

  it('approves an application, records the staff decision and unlocks foster-carer access', async () => {
    const response = await apiRequest('POST', '/api/staff/applications/APP-1001/approve', {
      note: 'Home environment and prior experience are suitable.',
    })
    const application = response.body.application
    const db = getDatabase()
    const applicantUser = db
      .prepare('SELECT role_id FROM users WHERE id = ?')
      .get('applicant-user-1')
    const audit = db
      .prepare(
        "SELECT action FROM audit_logs WHERE entity_id = ? AND action = 'application.approved'",
      )
      .get('APP-1001')
    const note = db
      .prepare('SELECT note_text FROM application_notes WHERE application_id = ?')
      .get('APP-1001')
    const duplicate = await apiRequest('POST', '/api/staff/applications/APP-1001/reject', {
      reason: 'A late rejection should not overwrite approval.',
    })

    assert.equal(response.status, 200)
    assert.equal(application.status, 'approved')
    assert.ok(application.decisionAt)
    assert.equal(application.decidedBy.id, 'staff-user-1')
    assert.equal(application.assignedStaff.id, 'staff-user-1')
    assert.equal(applicantUser.role_id, 'foster_carer')
    assert.equal(audit.action, 'application.approved')
    assert.equal(note.note_text, 'Home environment and prior experience are suitable.')
    assert.equal(duplicate.status, 409)
    assert.equal(duplicate.body.error.code, 'DECISION_RECORDED')
  })

  it('requires a rejection reason and records a final rejection decision', async () => {
    const invalid = await apiRequest('POST', '/api/staff/applications/APP-1002/reject', {
      reason: 'short',
    })
    const unchanged = await apiRequest('GET', '/api/staff/applications/APP-1002')
    const response = await apiRequest('POST', '/api/staff/applications/APP-1002/reject', {
      reason: 'The applicant has not provided required landlord permission.',
    })
    const application = response.body.application
    const db = getDatabase()
    const applicantUser = db
      .prepare('SELECT role_id FROM users WHERE id = ?')
      .get('applicant-user-2')
    const audit = db
      .prepare(
        "SELECT action FROM audit_logs WHERE entity_id = ? AND action = 'application.rejected'",
      )
      .get('APP-1002')
    const duplicate = await apiRequest('POST', '/api/staff/applications/APP-1002/approve', {
      note: 'This approval should not overwrite rejection.',
    })

    assert.equal(invalid.status, 400)
    assert.equal(invalid.body.error.code, 'VALIDATION_ERROR')
    assert.equal(unchanged.body.application.status, 'under_review')
    assert.equal(response.status, 200)
    assert.equal(application.status, 'rejected')
    assert.equal(
      application.rejectionReason,
      'The applicant has not provided required landlord permission.',
    )
    assert.ok(application.decisionAt)
    assert.equal(application.decidedBy.name, 'Morgan Staff')
    assert.equal(applicantUser.role_id, 'applicant')
    assert.equal(audit.action, 'application.rejected')
    assert.equal(duplicate.status, 409)
    assert.equal(duplicate.body.error.code, 'DECISION_RECORDED')
  })
})
