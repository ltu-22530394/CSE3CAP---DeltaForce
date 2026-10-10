import assert from 'node:assert/strict'
import { before, after, describe, it } from 'node:test'
import { randomUUID } from 'node:crypto'

process.env.GAPS_DB_FILE = ':memory:'
process.env.NODE_ENV = 'test'
process.env.EMAIL_MODE = 'preview'
process.env.JWT_SECRET = 'external-integration-test-secret-long-enough'
const { createApp } = await import('../app.js')
const { config } = await import('../config.js')
const { getDatabase, closeDatabase } = await import('../database/db.js')
const { queueEmail, flushEmails } =
  await import('../integrations/email.js')
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
  it('stores business notifications without contacting an email provider', async () => {
    const id = randomUUID()
    getDatabase()
      .prepare(
        "INSERT INTO users (id, email) VALUES (?, 'recipient@example.com')",
      )
      .run(id)
    const mailId = queueEmail({
      user: { id, email: 'recipient@example.com', fullName: 'Recipient' },
      type: 'approval',
      subject: 'Approved fixture',
      body: 'You have been approved.',
    })
    let requests = 0
    globalThis.fetch = async () => {
      requests += 1
      throw new Error('Email must not use the network')
    }
    try {
      await flushEmails()
    } finally {
      globalThis.fetch = realFetch
    }
    assert.equal(requests, 0)
    const notification = getDatabase()
      .prepare('SELECT delivery_status FROM notifications WHERE id = ?')
      .get(mailId)
    assert.notEqual(notification.delivery_status, 'sent')
    assert.equal(config.emailMode, 'disabled')
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
            Identifier__c: url.pathname.endsWith('/next')
              ? 'GH-2'
              : 'GH-1',
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
  it('exposes password configuration and removes Microsoft authentication routes', async () => {
    const configuration = await (
      await realFetch(base + '/api/auth/configuration')
    ).json()
    assert.equal(configuration.staffAuthentication, 'password')
    assert.equal(configuration.emailVerificationRequired, false)
    for (const route of ['start', 'callback', 'exchange'])
      assert.equal(
        (await realFetch(base + '/api/auth/microsoft/' + route)).status,
        404,
      )
  })
})
