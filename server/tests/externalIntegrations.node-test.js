import assert from 'node:assert/strict'
import { before, after, describe, it } from 'node:test'
import { generateKeyPairSync, randomUUID } from 'node:crypto'
import net from 'node:net'
import jwt from 'jsonwebtoken'

process.env.GAPS_DB_FILE = ':memory:'
process.env.NODE_ENV = 'test'
process.env.EMAIL_MODE = 'preview'
process.env.JWT_SECRET = 'external-integration-test-secret-long-enough'
const { createApp } = await import('../app.js')
const { config } = await import('../config.js')
const { getDatabase, closeDatabase } = await import('../database/db.js')
const { queueEmail, deliverEmail } = await import('../integrations/email.js')
const { fetchSalesforceGreyhounds } =
  await import('../integrations/salesforce.js')
const realFetch = globalThis.fetch
let server, base
before(() => {
  server = createApp().listen(0)
  base = `http://127.0.0.1:${server.address().port}`
})
after(async () => {
  globalThis.fetch = realFetch
  if (server) await new Promise((resolve) => server.close(resolve))
  closeDatabase()
})

describe('external provider contracts with local fixtures', () => {
  it('sends SMTP email and records success and failure without exposing credentials', async () => {
    const messages = []
    const smtp = net.createServer((socket) => {
      socket.write('220 localhost ESMTP\r\n')
      let buffer = '',
        data = false,
        message = ''
      socket.on('data', (chunk) => {
        buffer += chunk.toString()
        while (buffer.includes('\r\n')) {
          const index = buffer.indexOf('\r\n'),
            line = buffer.slice(0, index)
          buffer = buffer.slice(index + 2)
          if (data) {
            if (line === '.') {
              data = false
              messages.push(message)
              socket.write('250 Message accepted\r\n')
            } else message += line + '\r\n'
            continue
          }
          if (/^(EHLO|HELO)/i.test(line)) socket.write('250 localhost\r\n')
          else if (/^(MAIL|RCPT|RSET)/i.test(line)) socket.write('250 OK\r\n')
          else if (/^DATA/i.test(line)) {
            data = true
            socket.write('354 Send message\r\n')
          } else if (/^QUIT/i.test(line)) {
            socket.write('221 Goodbye\r\n')
            socket.end()
          }
        }
      })
    })
    await new Promise((resolve) => smtp.listen(0, '127.0.0.1', resolve))
    config.emailMode = 'smtp'
    config.smtpHost = '127.0.0.1'
    config.smtpPort = smtp.address().port
    const id = randomUUID()
    getDatabase()
      .prepare(
        "INSERT INTO users (id, email) VALUES (?, 'recipient@example.com')",
      )
      .run(id)
    const user = { id, email: 'recipient@example.com', fullName: 'Recipient' }
    const mailId = queueEmail({
      user,
      type: 'approval',
      subject: 'Approved fixture',
      body: 'You have been approved.',
    })
    await deliverEmail(mailId)
    assert.equal(
      getDatabase()
        .prepare('SELECT delivery_status FROM notifications WHERE id = ?')
        .get(mailId).delivery_status,
      'sent',
    )
    assert.ok(messages[0].includes('You have been approved.'))
    await new Promise((resolve) => smtp.close(resolve))
    config.smtpHost = undefined
    const failedId = queueEmail({
      user,
      type: 'approval',
      subject: 'Failure fixture',
      body: 'Test body',
    })
    await deliverEmail(failedId)
    assert.equal(
      getDatabase()
        .prepare('SELECT delivery_status FROM notifications WHERE id = ?')
        .get(failedId).delivery_status,
      'failed',
    )
    config.emailMode = 'preview'
  })
  it('reads paginated Salesforce records through OAuth and the configured field mapping', async () => {
    config.salesforceLoginUrl = 'https://fixture.my.salesforce.com'
    config.salesforceClientId = 'fixture-client'
    config.salesforceClientSecret = 'fixture-secret'
    config.salesforceObject = 'Greyhound__c'
    config.salesforceFieldMap = JSON.stringify({
      id: 'Identifier__c',
      name: 'Name',
      age: 'Age__c',
      sex: 'Sex__c',
    })
    const calls = []
    globalThis.fetch = async (input, options) => {
      const url = new URL(input)
      calls.push(url.pathname)
      if (url.pathname.endsWith('/token')) {
        assert.equal(
          new URLSearchParams(options.body).get('grant_type'),
          'client_credentials',
        )
        return Response.json({
          access_token: 'fixture-token',
          instance_url: 'https://fixture.my.salesforce.com',
        })
      }
      assert.equal(options.headers.authorization, 'Bearer fixture-token')
      return Response.json({
        records: [
          {
            Id: url.pathname.endsWith('/next') ? 'SF-2' : 'SF-1',
            Identifier__c: url.pathname.endsWith('/next') ? 'GH-2' : 'GH-1',
            Name: 'Buddy',
            Age__c: 3,
            Sex__c: 'Male',
          },
        ],
        ...(url.pathname.endsWith('/query')
          ? { nextRecordsUrl: '/services/data/v65.0/query/next' }
          : {}),
      })
    }
    try {
      const rows = await fetchSalesforceGreyhounds()
      assert.equal(rows.length, 2)
      assert.equal(rows[1].salesforceId, 'SF-2')
      assert.equal(rows[0].id, 'GH-1')
      assert.equal(calls.length, 3)
    } finally {
      globalThis.fetch = realFetch
      config.salesforceLoginUrl = undefined
      config.salesforceClientId = undefined
      config.salesforceClientSecret = undefined
      config.salesforceObject = undefined
      config.salesforceFieldMap = ''
    }
  })
  it('validates Microsoft signed tokens, PKCE, browser binding and single-use handoff codes', async () => {
    config.microsoftTenantId = 'fixture-tenant'
    config.microsoftClientId = 'fixture-client'
    config.microsoftClientSecret = 'fixture-secret'
    config.microsoftStaffIds = ['fixture-object']
    const issuer = 'https://login.microsoftonline.com/fixture-tenant/v2.0'
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    })
    const jwk = {
      ...publicKey.export({ format: 'jwk' }),
      kid: 'fixture-key',
      alg: 'RS256',
      use: 'sig',
    }
    let nonce,
      wrongAudience = false
    globalThis.fetch = async (input, options) => {
      const url = new URL(input)
      if (url.hostname === '127.0.0.1') return realFetch(input, options)
      if (url.pathname.includes('well-known'))
        return Response.json({
          issuer,
          authorization_endpoint: issuer + '/authorize',
          token_endpoint: issuer + '/token',
          jwks_uri: issuer + '/keys',
          response_types_supported: ['code'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: ['RS256'],
          token_endpoint_auth_methods_supported: ['client_secret_post'],
          code_challenge_methods_supported: ['S256'],
        })
      if (url.pathname.endsWith('/keys')) return Response.json({ keys: [jwk] })
      if (url.pathname.endsWith('/token')) {
        assert.ok(new URLSearchParams(options.body).get('code_verifier'))
        const idToken = jwt.sign(
          {
            tid: 'fixture-tenant',
            oid: 'fixture-object',
            preferred_username: 'staff@fixture.example',
            name: 'Fixture Staff',
            nonce,
          },
          privateKey,
          {
            algorithm: 'RS256',
            keyid: 'fixture-key',
            issuer,
            audience: wrongAudience ? 'wrong-client' : 'fixture-client',
            subject: 'fixture-user',
            expiresIn: 300,
          },
        )
        return Response.json({
          access_token: 'fixture-token',
          token_type: 'Bearer',
          expires_in: 300,
          id_token: idToken,
        })
      }
      throw new Error('Unexpected provider request')
    }
    try {
      const start = await realFetch(base + '/api/auth/microsoft/start', {
        redirect: 'manual',
      })
      assert.equal(start.status, 302)
      const target = new URL(start.headers.get('location'))
      nonce = target.searchParams.get('nonce')
      assert.equal(target.searchParams.get('code_challenge_method'), 'S256')
      const callback =
        base +
        '/api/auth/microsoft/callback?code=fixture-code&state=' +
        target.searchParams.get('state')
      assert.equal(
        (await realFetch(callback, { redirect: 'manual' })).status,
        400,
      )
      const response = await realFetch(callback, {
        redirect: 'manual',
        headers: { cookie: start.headers.get('set-cookie').split(';')[0] },
      })
      assert.equal(response.status, 302)
      assert.equal(
        new URL(response.headers.get('location')).pathname,
        '/staff/login',
      )
      const code = new URLSearchParams(
        new URL(response.headers.get('location')).hash.slice(1),
      ).get('sso')
      const exchange = () =>
        realFetch(base + '/api/auth/microsoft/exchange', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code }),
        })
      const session = await (await exchange()).json()
      assert.equal(session.user.role, 'staff')
      assert.ok(session.token)
      assert.equal((await exchange()).status, 401)
      const nextStart = await realFetch(base + '/api/auth/microsoft/start', {
        redirect: 'manual',
      })
      const nextTarget = new URL(nextStart.headers.get('location'))
      nonce = nextTarget.searchParams.get('nonce')
      wrongAudience = true
      assert.equal(
        (
          await realFetch(
            base +
              '/api/auth/microsoft/callback?code=wrong-code&state=' +
              nextTarget.searchParams.get('state'),
            {
              redirect: 'manual',
              headers: {
                cookie: nextStart.headers.get('set-cookie').split(';')[0],
              },
            },
          )
        ).status,
        401,
      )
    } finally {
      globalThis.fetch = realFetch
      config.microsoftTenantId = undefined
      config.microsoftClientId = undefined
      config.microsoftClientSecret = undefined
      config.microsoftStaffIds = []
    }
  })
})
