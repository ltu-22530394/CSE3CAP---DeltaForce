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

const { createApp } = await import('../app.js')
const { closeDatabase } = await import('../database/db.js')

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

    const me = await apiRequest('GET', '/api/auth/me', undefined, login.body.token)

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
})
