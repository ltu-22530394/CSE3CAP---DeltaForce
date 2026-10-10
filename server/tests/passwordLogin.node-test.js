import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'

process.env.NODE_ENV = 'production'
process.env.GAPS_DB_FILE = ':memory:'
process.env.APP_ORIGIN = 'https://portal.example.test'
process.env.TRUST_PROXY_HOPS = '1'
process.env.JWT_SECRET =
  'production-password-test-secret-more-than-32-characters'
process.env.PASSWORD_SALT_ROUNDS = '4'
process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@example.test'
process.env.BOOTSTRAP_ADMIN_NAME = 'Demo Administrator'
process.env.BOOTSTRAP_ADMIN_PASSWORD = 'PrivateBootstrapPassword123!'
// Old deployment variables must not restore the removed provider requirements.
process.env.EMAIL_MODE = 'smtp'
process.env.SMTP_HOST = 'unreachable.example.test'
process.env.MICROSOFT_CLIENT_ID = 'obsolete-provider-setting'
const { createApp } = await import('../app.js')
const { config } = await import('../config.js')
const { getDatabase, closeDatabase } = await import('../database/db.js')
const { bootstrapAdmin } = await import('../scripts/bootstrap-admin.js')
let server, base, adminToken, applicantToken, applicantId, staffId
async function request(method, route, data, token) {
  const response = await fetch(base + route, {
    method,
    headers: {
      'x-forwarded-proto': 'https',
      ...(data === undefined
        ? {}
        : { 'content-type': 'application/json' }),
      ...(token ? { authorization: 'Bearer ' + token } : {}),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  })
  const body = response.status === 204 ? null : await response.json()
  return { status: response.status, body }
}
const login = (email, password, audience) =>
  request('POST', '/api/auth/login', { email, password, audience })
before(() => {
  server = createApp().listen(0)
  base = `http://127.0.0.1:${server.address().port}`
})
after(async () => {
  await new Promise((resolve) => server.close(resolve))
  closeDatabase()
})
describe('password login in production without email or Microsoft', () => {
  it('starts without SMTP/Entra and privately creates the first administrator', async () => {
    assert.equal(config.emailMode, 'disabled')
    assert.equal(config.demoStaffEnabled, false)
    const response = await login(
      'admin@example.test',
      'PrivateBootstrapPassword123!',
      'staff',
    )
    assert.equal(response.status, 200)
    assert.equal(response.body.user.role, 'admin')
    adminToken = response.body.token
    const row = getDatabase()
      .prepare('SELECT password_hash FROM users WHERE email = ?')
      .get('admin@example.test')
    assert.notEqual(row.password_hash, config.bootstrapAdminPassword)
    assert.ok(
      bcrypt.compareSync(config.bootstrapAdminPassword, row.password_hash),
    )
    assert.equal(
      getDatabase()
        .prepare("SELECT id FROM users WHERE email = 'jamie@gap.example'")
        .get(),
      undefined,
    )
  })
  it('registers applicants only and allows immediate login without verification', async () => {
    const registered = await request('POST', '/api/auth/register', {
      fullName: 'New Applicant',
      email: 'applicant@example.test',
      password: 'ApplicantPassword123!',
      termsAccepted: true,
      privacyConsent: true,
      role: 'admin',
      role_id: 'staff',
      emailVerified: true,
    })
    assert.equal(registered.status, 201)
    assert.equal(registered.body.user.role, 'applicant')
    assert.equal(registered.body.verificationUrl, undefined)
    applicantId = registered.body.user.id
    assert.equal(
      getDatabase()
        .prepare('SELECT email_verified_at FROM users WHERE id = ?')
        .get(applicantId).email_verified_at,
      null,
    )
    assert.equal(
      getDatabase()
        .prepare('SELECT count(*) AS n FROM email_verification_tokens')
        .get().n,
      0,
    )
    const response = await login(
      'applicant@example.test',
      'ApplicantPassword123!',
      'applicant',
    )
    assert.equal(response.status, 200)
    applicantToken = response.body.token
    assert.equal(
      (
        await login(
          'applicant@example.test',
          'ApplicantPassword123!',
          'staff',
        )
      ).status,
      403,
    )
  })
  it('denies public and applicant access to staff provisioning and password reset', async () => {
    const details = {
      email: 'staff@example.test',
      name: 'Staff Member',
      role: 'staff',
      password: 'StaffPassword123!',
    }
    assert.equal(
      (await request('POST', '/api/portal/admin/users', details)).status,
      401,
    )
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/admin/users',
          details,
          applicantToken,
        )
      ).status,
      403,
    )
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/admin/users',
          { id: applicantId, password: 'ChangedPassword123!' },
          applicantToken,
        )
      ).status,
      403,
    )
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/admin/users',
          { ...details, password: undefined },
          adminToken,
        )
      ).status,
      400,
    )
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/admin/users',
          { ...details, password: 'a'.repeat(73) },
          adminToken,
        )
      ).status,
      400,
    )
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/admin/users',
          details,
          adminToken,
        )
      ).status,
      200,
    )
    const staff = await login(details.email, details.password, 'staff')
    assert.equal(staff.status, 200)
    staffId = staff.body.user.id
    assert.equal(
      (
        await request(
          'GET',
          '/api/portal/admin/users',
          undefined,
          staff.body.token,
        )
      ).status,
      403,
    )
    assert.equal(
      (await login(details.email, details.password, 'applicant')).status,
      403,
    )
  })
  it('replaces applicant passwords securely and revokes old sessions and recovery tokens', async () => {
    getDatabase()
      .prepare(
        'INSERT INTO password_reset_tokens (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)',
      )
      .run(randomUUID(), applicantId, randomUUID(), '2099-01-01')
    const result = await request(
      'POST',
      '/api/portal/admin/users',
      { id: applicantId, password: 'ChangedApplicantPassword123!' },
      adminToken,
    )
    assert.equal(result.status, 200)
    assert.equal(
      (await request('GET', '/api/auth/me', undefined, applicantToken))
        .status,
      401,
    )
    assert.equal(
      (
        await login(
          'applicant@example.test',
          'ApplicantPassword123!',
          'applicant',
        )
      ).status,
      401,
    )
    assert.equal(
      (
        await login(
          'applicant@example.test',
          'ChangedApplicantPassword123!',
          'applicant',
        )
      ).status,
      200,
    )
    assert.equal(
      getDatabase()
        .prepare(
          'SELECT count(*) AS n FROM password_reset_tokens WHERE used_at IS NULL',
        )
        .get().n,
      0,
    )
  })
  it('retains disabled-account, lockout and last-administrator protections', async () => {
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/admin/users',
          { id: staffId, status: 'disabled' },
          adminToken,
        )
      ).status,
      200,
    )
    assert.equal(
      (await login('staff@example.test', 'StaffPassword123!', 'staff'))
        .status,
      403,
    )
    const admin = (
      await request('GET', '/api/auth/me', undefined, adminToken)
    ).body.user
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/admin/users',
          { id: admin.id, status: 'disabled' },
          adminToken,
        )
      ).status,
      409,
    )
    getDatabase()
      .prepare(
        "UPDATE users SET locked_until = datetime('now', '+15 minutes') WHERE id = ?",
      )
      .run(applicantId)
    assert.equal(
      (
        await login(
          'applicant@example.test',
          'ChangedApplicantPassword123!',
          'applicant',
        )
      ).status,
      429,
    )
  })
  it('does not overwrite existing passwords, promote applicants or reactivate administrators on startup', () => {
    const admin = getDatabase()
      .prepare(
        "SELECT id,password_hash FROM users WHERE role_id = 'admin'",
      )
      .get()
    config.bootstrapAdminPassword = 'DifferentBootstrapPassword123!'
    bootstrapAdmin()
    assert.equal(
      getDatabase()
        .prepare('SELECT password_hash FROM users WHERE id = ?')
        .get(admin.id).password_hash,
      admin.password_hash,
    )
    getDatabase()
      .prepare("UPDATE users SET account_status = 'disabled' WHERE id = ?")
      .run(admin.id)
    bootstrapAdmin()
    assert.equal(
      getDatabase()
        .prepare('SELECT account_status FROM users WHERE id = ?')
        .get(admin.id).account_status,
      'disabled',
    )
    getDatabase()
      .prepare("UPDATE users SET account_status = 'active' WHERE id = ?")
      .run(admin.id)
    config.bootstrapAdminEmail = 'applicant@example.test'
    bootstrapAdmin()
    assert.equal(
      getDatabase()
        .prepare('SELECT role_id FROM users WHERE id = ?')
        .get(applicantId).role_id,
      'applicant',
    )
    config.bootstrapAdminEmail = 'admin@example.test'
  })
  it('allows private migration of only the exact active passwordless administrator', () => {
    const id = randomUUID()
    getDatabase()
      .prepare("INSERT INTO users (id,email,role_id) VALUES (?,?,'admin')")
      .run(id, 'old-sso-admin@example.test')
    config.bootstrapAdminEmail = 'old-sso-admin@example.test'
    bootstrapAdmin()
    assert.ok(
      bcrypt.compareSync(
        config.bootstrapAdminPassword,
        getDatabase()
          .prepare('SELECT password_hash FROM users WHERE id = ?')
          .get(id).password_hash,
      ),
    )
    config.bootstrapAdminEmail = 'admin@example.test'
  })
  it('removes provider endpoints and refuses public password recovery or verification', async () => {
    for (const route of [
      'verify-email',
      'resend-verification',
      'forgot-password',
      'reset-password',
    ]) {
      const response = await request('POST', '/api/auth/' + route, {
        email: 'applicant@example.test',
        token: 'old-token',
        password: 'UnsafeReset123!',
      })
      assert.equal(response.status, 410)
      assert.equal(response.body.verificationUrl, undefined)
    }
    assert.equal(
      (await request('GET', '/api/auth/microsoft/start')).status,
      404,
    )
  })
  it('does not expose password hashes, secrets or legacy recovery messages', async () => {
    const users = await request(
      'GET',
      '/api/portal/admin/users',
      undefined,
      adminToken,
    )
    const audit = await request(
      'GET',
      '/api/portal/admin/audit',
      undefined,
      adminToken,
    )
    const { queueEmail } = await import('../integrations/email.js')
    queueEmail({
      user: { id: applicantId, email: 'applicant@example.test' },
      type: 'password_reset',
      subject: 'Legacy reset',
      body: 'private-legacy-token',
    })
    const history = await request(
      'GET',
      '/api/portal/staff/notifications',
      undefined,
      adminToken,
    )
    assert.equal(history.status, 200)
    const serialized = JSON.stringify([
      users.body,
      audit.body,
      history.body,
    ])
    for (const secret of [
      'password_hash',
      'PrivateBootstrapPassword123!',
      'ChangedApplicantPassword123!',
      'private-legacy-token',
    ])
      assert.equal(serialized.includes(secret), false)
  })
})
