import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gaps-auth-api-'))

process.env.GAPS_DB_FILE = path.join(tempDir, 'test.sqlite')
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-auth-api-tests'
process.env.JWT_EXPIRES_IN = '15m'
process.env.NODE_ENV = 'test'
process.env.DEMO_STAFF_ENABLED = 'true'

const { createApp } = await import('../app.js')
const { closeDatabase } = await import('../database/db.js')
const { getDatabase } = await import('../database/db.js')
const { hashPassword } = await import('../utils/password.js')

let server
let baseUrl

before(() => {
  const app = createApp()
  server = app.listen(0)
  const address = server.address()
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(() => {
  server.close()
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

async function apiRequest(method, route, body = undefined, token = undefined) {
  if (route === '/api/auth/register')
    body = { termsAccepted: true, privacyConsent: true, ...body }
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  const result = text ? JSON.parse(text) : null
  if (
    route === '/api/auth/register' &&
    response.status === 201 &&
    result.verificationUrl
  )
    await apiRequest('POST', '/api/auth/verify-email', {
      token: new URLSearchParams(
        new URL(result.verificationUrl).hash.slice(1),
      ).get('token'),
    })
  return {
    body: result,
    status: response.status,
  }
}

describe('authentication API', () => {
  it('registers an applicant without returning the password hash', async () => {
    const response = await apiRequest('POST', '/api/auth/register', {
      fullName: 'Taylor Applicant',
      email: 'taylor@example.com',
      password: 'safe-password',
    })

    assert.equal(response.status, 201)
    assert.equal(response.body.user.email, 'taylor@example.com')
    assert.equal(response.body.user.fullName, 'Taylor Applicant')
    assert.equal(response.body.user.role, 'applicant')
    assert.equal(response.body.user.password_hash, undefined)
  })

  it('blocks duplicate email registration', async () => {
    await apiRequest('POST', '/api/auth/register', {
      fullName: 'Duplicate Applicant',
      email: 'duplicate@example.com',
      password: 'safe-password',
    })

    const duplicate = await apiRequest('POST', '/api/auth/register', {
      fullName: 'Duplicate Applicant',
      email: 'DUPLICATE@example.com',
      password: 'safe-password',
    })

    assert.equal(duplicate.status, 409)
    assert.equal(duplicate.body.error.code, 'EMAIL_EXISTS')
  })

  it('logs in and returns the current authenticated user', async () => {
    await apiRequest('POST', '/api/auth/register', {
      fullName: 'Jordan Login',
      email: 'jordan@example.com',
      password: 'safe-password',
    })

    const login = await apiRequest('POST', '/api/auth/login', {
      email: 'jordan@example.com',
      password: 'safe-password',
    })

    assert.equal(login.status, 200)
    assert.equal(login.body.tokenType, 'Bearer')
    assert.ok(login.body.token)

    const me = await apiRequest(
      'GET',
      '/api/auth/me',
      undefined,
      login.body.token,
    )

    assert.equal(me.status, 200)
    assert.equal(me.body.user.email, 'jordan@example.com')
    assert.equal(me.body.user.role, 'applicant')
  })

  it('rejects invalid credentials and unauthenticated protected requests', async () => {
    const missingToken = await apiRequest('GET', '/api/auth/me')
    const invalidLogin = await apiRequest('POST', '/api/auth/login', {
      email: 'missing@example.com',
      password: 'wrong-password',
    })

    assert.equal(missingToken.status, 401)
    assert.equal(missingToken.body.error.code, 'AUTH_REQUIRED')
    assert.equal(invalidLogin.status, 401)
    assert.equal(invalidLogin.body.error.code, 'INVALID_CREDENTIALS')
  })

  it('only creates a session for the selected account portal', async () => {
    const applicant = { email: 'jordan@example.com', password: 'safe-password' }
    const staff = { email: 'jamie@gap.example', password: 'Greyhound2026!' }
    getDatabase()
      .prepare(
        "INSERT INTO users (id, email, password_hash, role_id, email_verified_at) VALUES ('portal-test-admin', ?, ?, 'admin', datetime('now'))",
      )
      .run(staff.email, await hashPassword(staff.password))
    for (const credentials of [applicant, staff]) {
      const correctAudience = credentials === staff ? 'staff' : 'applicant'
      const mismatch = await apiRequest('POST', '/api/auth/login', {
        ...credentials,
        audience: correctAudience === 'staff' ? 'applicant' : 'staff',
      })
      assert.equal(mismatch.status, 403)
      assert.equal(mismatch.body.error.code, 'PORTAL_MISMATCH')
      assert.equal(mismatch.body.token, undefined)
      const correct = await apiRequest('POST', '/api/auth/login', {
        ...credentials,
        audience: correctAudience,
      })
      assert.equal(correct.status, 200)
      assert.ok(correct.body.token)
      assert.equal(
        correct.body.user.role,
        credentials === staff ? 'admin' : 'applicant',
      )
    }
  })

  it('rejects invalid portal selections without issuing a session', async () => {
    const response = await apiRequest('POST', '/api/auth/login', {
      email: 'jamie@gap.example',
      password: 'Greyhound2026!',
      audience: 'admin',
    })
    assert.equal(response.status, 400)
    assert.equal(response.body.error.code, 'VALIDATION_ERROR')
    assert.equal(response.body.token, undefined)
  })

  it('keeps routine session reads outside the sign-in rate limit', async () => {
    const environment = process.env.NODE_ENV
    let limitedServer
    try {
      process.env.NODE_ENV = 'development'
      limitedServer = createApp().listen(0)
      process.env.NODE_ENV = environment
      const base = `http://127.0.0.1:${limitedServer.address().port}`
      const login = await fetch(base + '/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'jordan@example.com',
          password: 'safe-password',
          audience: 'applicant',
        }),
      })
      assert.equal(login.status, 200)
      const { token } = await login.json()
      for (let i = 0; i < 65; i++) {
        assert.equal(
          (await fetch(base + '/api/auth/configuration')).status,
          200,
        )
        assert.equal(
          (
            await fetch(base + '/api/auth/me', {
              headers: { authorization: `Bearer ${token}` },
            })
          ).status,
          200,
        )
      }
      for (let i = 0; i < 60; i++) {
        const response = await fetch(base + '/api/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            email: 'missing@example.com',
            password: 'not-a-valid-password',
          }),
        })
        assert.equal(response.status, i === 59 ? 429 : 401)
      }
    } finally {
      process.env.NODE_ENV = environment
      if (limitedServer) {
        limitedServer.closeAllConnections()
        await new Promise((resolve) => limitedServer.close(resolve))
      }
    }
  })
})
