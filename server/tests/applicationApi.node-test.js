import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gaps-application-api-'))
process.env.GAPS_DB_FILE = path.join(tempDir, 'test.sqlite')
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-application-tests'
process.env.NODE_ENV = 'test'
const { createApp } = await import('../app.js')
const { closeDatabase } = await import('../database/db.js')
let server, baseUrl, token

async function request(method, route, body) {
  const response = await fetch(`${baseUrl}${route}`, { method, headers: { ...(body ? {'content-type':'application/json'} : {}), ...(token ? {authorization:`Bearer ${token}`} : {}) }, body: body ? JSON.stringify(body) : undefined })
  const text = await response.text(); return { status: response.status, body: text ? JSON.parse(text) : null }
}

before(async () => {
  server = createApp().listen(0); baseUrl = `http://127.0.0.1:${server.address().port}`
  await request('POST','/api/auth/register',{fullName:'API Applicant',email:'api@example.com',password:'safe-password'})
  const login = await request('POST','/api/auth/login',{email:'api@example.com',password:'safe-password'}); token = login.body.token
})
after(() => { server.close(); closeDatabase(); fs.rmSync(tempDir,{recursive:true,force:true}) })

describe('applicant CRUD API', () => {
  let id
  it('creates a draft', async () => { const r=await request('POST','/api/applications',{currentStep:2,householdType:'house'}); assert.equal(r.status,201); assert.equal(r.body.application.status,'draft'); id=r.body.application.id })
  it('lists and reads owned drafts', async () => { assert.equal((await request('GET','/api/applications')).body.applications.length,1); assert.equal((await request('GET',`/api/applications/${id}`)).status,200) })
  it('updates a draft', async () => { const r=await request('PUT',`/api/applications/${id}`,{reasonForApplying:'Ready to foster',emergencyContactName:'Sam',emergencyContactPhone:'0400000000',termsAccepted:true,privacyConsent:true}); assert.equal(r.body.application.reasonForApplying,'Ready to foster') })
  it('submits and locks the application', async () => { assert.equal((await request('POST',`/api/applications/${id}/submit`)).body.application.status,'submitted'); assert.equal((await request('PUT',`/api/applications/${id}`,{currentStep:5})).status,409) })
  it('prevents deletion after submission', async () => { assert.equal((await request('DELETE',`/api/applications/${id}`)).status,409) })
})
