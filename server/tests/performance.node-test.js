import assert from 'node:assert/strict'
import { it } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gap-volume-'))
process.env.GAPS_DB_FILE = path.join(temp, 'volume.sqlite')
process.env.JWT_SECRET = 'volume-test-secret-more-than-thirty-two-characters'
process.env.NODE_ENV = 'test'
const { initializeDatabase, getDatabase, closeDatabase, withTransaction } =
  await import('../database/db.js')
const { listStaffApplications, listGreyhounds } =
  await import('../repositories/portalRepository.js')
const { parseGreyhoundCsv } = await import('../integrations/greyhoundImport.js')

it('lists and searches 5,000 application and greyhound records within the local three-second target', () => {
  try {
    initializeDatabase()
    const db = getDatabase()
    withTransaction(() => {
      const user = db.prepare(
        "INSERT INTO users (id,email,role_id) VALUES (?,?,'applicant')",
      )
      const applicant = db.prepare(
        "INSERT INTO applicants (id,user_id,first_name,last_name) VALUES (?,?,'Volume','Applicant')",
      )
      const application = db.prepare(
        "INSERT INTO foster_applications (id,applicant_id,application_status,submitted_at) VALUES (?,?,'submitted',datetime('now'))",
      )
      const state = db.prepare(
        'INSERT INTO portal_application_state (application_id,form_json) VALUES (?,?)',
      )
      const dog = db.prepare(
        "INSERT INTO greyhounds (id,greyhound_identifier,name,age_years,sex) VALUES (?,?,?,3,'male')",
      )
      for (let i = 0; i < 5000; i++) {
        user.run('user-' + i, 'volume-' + i + '@test.example')
        applicant.run('applicant-' + i, 'user-' + i)
        application.run('application-' + i, 'applicant-' + i)
        state.run(
          'application-' + i,
          JSON.stringify({
            fullName: 'Volume Applicant ' + i,
            email: 'volume-' + i + '@test.example',
            phone: '0412345678',
            applicationType: 'foster',
            suburb: 'Sydney',
          }),
        )
        dog.run('dog-' + i, 'VOL-' + i, 'Volume Buddy ' + i)
      }
    })
    let start = performance.now()
    assert.equal(listStaffApplications().length, 5000)
    const listMs = performance.now() - start
    start = performance.now()
    assert.equal(
      listStaffApplications({ q: 'volume-4999@test.example' }).length,
      1,
    )
    const searchMs = performance.now() - start
    start = performance.now()
    assert.equal(listGreyhounds({ q: 'VOL-4999' }).length, 1)
    const dogMs = performance.now() - start
    start = performance.now()
    const csv =
      'id,name,age,sex\n' +
      Array.from(
        { length: 5000 },
        (_, i) => 'CSV-' + i + ',Import Buddy ' + i + ',3,Male',
      ).join('\n')
    assert.equal(parseGreyhoundCsv(csv, 'volume.csv').length, 5000)
    const importMs = performance.now() - start
    console.log(
      'Local volume benchmark (ms):',
      JSON.stringify({ listMs, searchMs, dogMs, importMs }),
    )
    for (const timing of [listMs, searchMs, dogMs, importMs])
      assert.ok(
        timing < 3000,
        'Local benchmark exceeded three seconds: ' + timing,
      )
  } finally {
    closeDatabase()
    fs.rmSync(temp, { recursive: true, force: true })
  }
})
