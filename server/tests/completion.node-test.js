import assert from 'node:assert/strict'
import { before, after, describe, it } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { spawnSync } from 'node:child_process'
import ExcelJS from 'exceljs'
import { parse } from 'csv-parse/sync'

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gap-completion-'))
process.env.GAPS_DB_FILE = path.join(temp, 'portal.sqlite')
process.env.BACKUP_DIR = path.join(temp, 'backups')
process.env.JWT_SECRET =
  'completion-test-secret-more-than-thirty-two-characters'
process.env.NODE_ENV = 'test'
process.env.EMAIL_MODE = 'preview'
process.env.PASSWORD_SALT_ROUNDS = '4'
const { createApp } = await import('../app.js')
const { getDatabase, closeDatabase, initializeDatabase } =
  await import('../database/db.js')
const { createAccessToken } = await import('../utils/jwt.js')
const { findPublicUserById } = await import('../repositories/userRepository.js')
const { csvCell, csvDocument } =
  await import('../integrations/greyhoundImport.js')
const { config } = await import('../config.js')
let server, base, admin, staff, carer, application, dog, createdStaff
const form = {
  fullName: 'Complete Foster',
  email: 'complete@example.test',
  dateOfBirth: '1990-04-12',
  phone: '0412345678',
  address: '10 Sample Street',
  suburb: 'Sydney',
  state: 'NSW',
  postcode: '2000',
  residenceType: 'house',
  housingStatus: 'owner',
  adultsInHome: '2',
  childrenInHome: '0',
  secureYard: 'yes',
  applicationType: 'foster',
  dogExperience: 'Five years caring for dogs',
  greyhoundExperience: 'no',
  hasCurrentPets: 'no',
  preferredFosteringPeriod: 'Four weeks',
  availability: 'Weekdays',
  transportAvailability: 'yes',
  reasonForApplying: 'Provide a calm foster home',
  emergencyContactName: 'Sam Foster',
  emergencyContactPhone: '0412345679',
  confirmAccurate: true,
  termsAccepted: true,
  privacyConsent: true,
}
async function request(method, route, body, token = admin) {
  const response = await fetch(base + route, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: 'Bearer ' + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const content = response.headers.get('content-type') || ''
  const value = content.includes('json')
    ? await response.json()
    : content.includes('spreadsheet')
      ? Buffer.from(await response.arrayBuffer())
      : await response.text()
  return { status: response.status, body: value, headers: response.headers }
}
function staffAccount(role) {
  const db = getDatabase(),
    id = randomUUID()
  db.prepare(
    "INSERT INTO users (id,email,role_id,email_verified_at) VALUES (?,?,?,datetime('now'))",
  ).run(id, id + '@gap.test', role)
  db.prepare(
    'INSERT INTO staff_profiles (id,user_id,full_name) VALUES (?,?,?)',
  ).run(randomUUID(), id, 'Test ' + role)
  return createAccessToken(findPublicUserById(id))
}
async function applicant(email = form.email) {
  const applied = await request(
    'POST',
    '/api/portal/apply',
    { form: { ...form, email }, password: 'Password123!' },
    null,
  )
  assert.equal(applied.status, 201)
  const token = new URLSearchParams(
    new URL(applied.body.verificationUrl).hash.slice(1),
  ).get('token')
  assert.equal(
    (await request('POST', '/api/auth/verify-email', { token }, null)).status,
    200,
  )
  const login = await request(
    'POST',
    '/api/auth/login',
    { email, password: 'Password123!' },
    null,
  )
  return {
    token: login.body.token,
    id: applied.body.applicationId,
    userId: login.body.user.id,
  }
}
async function current() {
  return (
    await request('GET', '/api/portal/staff/applications/' + application.id)
  ).body.application
}
async function manage(action, details = {}) {
  const a = await current()
  return request('POST', '/api/portal/staff/applications/' + a.id + '/manage', {
    action,
    revision: a.revision,
    ...details,
  })
}
before(async () => {
  server = createApp().listen(0)
  base = 'http://127.0.0.1:' + server.address().port
  admin = staffAccount('admin')
  staff = staffAccount('staff')
  application = await applicant()
  carer = application.token
})
after(async () => {
  await new Promise((resolve) => server.close(resolve))
  closeDatabase()
  fs.rmSync(temp, { recursive: true, force: true })
})
describe('requirements completion and security regressions', () => {
  it('keeps profile corrections separate from the protected submitted form and account email', async () => {
    const saved = await request(
      'POST',
      '/api/portal/profile',
      {
        fullName: 'Updated Foster',
        phone: '0499999999',
        address: '22 Updated Road',
        suburb: 'Newcastle',
        state: 'NSW',
        postcode: '2300',
        email: 'other@test.example',
      },
      carer,
    )
    assert.equal(saved.status, 200)
    assert.equal(saved.body.profile.email, form.email)
    const a = await current()
    assert.equal(a.form.phone, form.phone)
    assert.equal(a.currentContact.phone, '0499999999')
    assert.equal(
      (
        await request(
          'GET',
          '/api/portal/staff/applications?q=0499999999&location=Newcastle',
        )
      ).body.applications.length,
      1,
    )
    assert.equal(
      (await request('POST', '/api/portal/profile', { phone: 'x' }, carer))
        .status,
      400,
    )
  })
  it('supports staff assignment, independent private/public notes and stale revision prevention', async () => {
    const member = (
      await request('GET', '/api/portal/staff/directory')
    ).body.staff.find((s) => s.role === 'staff')
    assert.equal(
      (await manage('assign_staff', { staffId: member.id })).status,
      200,
    )
    assert.equal(
      (
        await request(
          'GET',
          '/api/portal/staff/applications?staff=' + member.id,
        )
      ).body.applications.length,
      1,
    )
    const old = await current()
    await manage('note', {
      note: 'Private staff assessment',
      applicantVisible: false,
    })
    assert.equal(
      (
        await request(
          'GET',
          '/api/portal/applications/' + application.id,
          undefined,
          carer,
        )
      ).body.application.reviewNote,
      undefined,
    )
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/staff/applications/' + application.id + '/manage',
          {
            action: 'note',
            note: 'Stale private note',
            revision: old.revision,
          },
        )
      ).status,
      409,
    )
    await manage('note', {
      note: 'Please confirm your availability',
      applicantVisible: true,
    })
    assert.equal(
      (
        await request(
          'GET',
          '/api/portal/applications/' + application.id,
          undefined,
          carer,
        )
      ).body.application.reviewNote,
      'Please confirm your availability',
    )
  })
  it('permits one complete correction without changing the original submission date', async () => {
    const before = await current()
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/applications',
          { id: application.id, form, submit: true },
          carer,
        )
      ).status,
      409,
    )
    await manage('allow_edit')
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/applications',
          { id: application.id, form, submit: false },
          carer,
        )
      ).status,
      400,
    )
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/applications',
          {
            id: application.id,
            form: { ...form, email: 'other@example.com' },
            submit: true,
          },
          carer,
        )
      ).status,
      400,
    )
    const saved = await request(
      'POST',
      '/api/portal/applications',
      {
        id: application.id,
        form: {
          ...form,
          householdDetails: 'Two adults at home',
          yardInformation: 'Fenced grass yard',
          preferredGreyhoundCharacteristics: 'Calm temperament',
        },
        currentStep: 3,
        submit: true,
      },
      carer,
    )
    assert.equal(saved.status, 201)
    assert.equal(saved.body.application.editable, false)
    assert.equal(saved.body.application.submittedAt, before.submittedAt)
    const correctedAudit = getDatabase()
      .prepare(
        "SELECT previous_value_json FROM audit_logs WHERE action = 'application.submitted' AND entity_id = ? ORDER BY rowid DESC LIMIT 1",
      )
      .get(application.id)
    assert.equal(
      JSON.parse(correctedAudit.previous_value_json).form.email,
      form.email,
    )
    assert.equal((await current()).form.householdDetails, 'Two adults at home')
  })
  it('shows only active public resources to visitors and gates carer resources', async () => {
    for (const [title, restricted, active] of [
      ['Public guide', false, true],
      ['Private care guide', true, true],
      ['Archived guide', false, false],
    ]) {
      assert.equal(
        (
          await request('POST', '/api/portal/staff/resources', {
            title,
            type: 'pdf',
            url: 'https://example.com/' + title.replaceAll(' ', '-') + '.pdf',
            requiresApproval: restricted,
            active,
          })
        ).status,
        200,
      )
    }
    const publicData = (
      await request('GET', '/api/portal/public', undefined, null)
    ).body
    assert.deepEqual(
      publicData.resources.map((r) => r.title),
      ['Public guide'],
    )
    assert.equal(publicData.settings.weeklyRecipients, undefined)
    assert.equal(
      (await request('GET', '/api/portal/resources', undefined, carer)).status,
      403,
    )
    assert.equal(
      (
        await request('POST', '/api/portal/staff/resources', {
          title: 'Unsafe',
          type: 'link',
          url: 'javascript:alert(1)',
        })
      ).status,
      400,
    )
    const a = await current()
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/staff/applications/' + a.id + '/decision',
          { decision: 'approved', revision: a.revision },
        )
      ).status,
      200,
    )
    assert.equal(
      (await request('GET', '/api/portal/resources', undefined, carer)).body
        .resources.length,
      2,
    )
  })
  it('validates and persists complete greyhound metadata, compatibility and filters', async () => {
    const input = {
      identifier: 'FULL-1',
      salesforceId: 'SF-1',
      registrationNumber: 'REG-1',
      name: 'Complete Buddy',
      age: 3,
      sex: 'Unknown',
      status: 'available',
      dateOfBirth: '2023-01-01',
      colour: 'Black',
      location: 'Sydney',
      compatibleWithChildren: 1,
      compatibleWithCats: 0,
      compatibleWithSmallDogs: null,
      compatibleWithOtherAnimals: true,
      specialRequirements: 'Quiet home',
      careInstructions: 'Daily walk',
      feedingInformation: 'Two meals daily',
      medicalNotes: 'Annual review',
      behaviourNotes: 'Calm',
      photoUrl: 'https://example.com/buddy.jpg',
    }
    const saved = await request('POST', '/api/portal/staff/greyhounds', input)
    assert.equal(saved.status, 200)
    dog = saved.body.greyhound
    assert.equal(dog.feedingInformation, input.feedingInformation)
    assert.equal(dog.compatibleWithCats, 0)
    assert.equal(
      (
        await request(
          'GET',
          '/api/portal/staff/greyhounds?q=REG-1&location=Sydney&compatibility=children&minAge=2&maxAge=4',
        )
      ).body.greyhounds.length,
      1,
    )
    for (const change of [
      { identifier: 'FULL-2', age: '', dateOfBirth: '' },
      { identifier: 'FULL-2', status: 'allocated' },
      { identifier: 'FULL-2', dateOfBirth: '2024-02-30' },
      { identifier: 'FULL-2', photoUrl: 'https://user:password@example.com/a' },
    ])
      assert.equal(
        (
          await request('POST', '/api/portal/staff/greyhounds', {
            ...input,
            ...change,
          })
        ).status,
        400,
      )
    assert.equal(
      (
        await request('POST', '/api/portal/staff/greyhounds', {
          ...input,
          identifier: 'OTHER',
        })
      ).status,
      409,
    )
  })
  it('updates placement dates privately and retains complete history after return', async () => {
    let a = await current()
    const today = new Date().toISOString().slice(0, 10)
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/staff/applications/' + a.id + '/allocation',
          {
            greyhoundId: dog.id,
            revision: a.revision,
            startDate: today,
            endDate: '2099-01-01',
            note: 'Private transport arrangement',
          },
        )
      ).status,
      200,
    )
    const applicantView = (
      await request('GET', '/api/portal/applications/' + a.id, undefined, carer)
    ).body.application.assignment
    assert.equal(applicantView.feedingInformation, 'Two meals daily')
    assert.equal(applicantView.internalNotes, undefined)
    assert.equal((await manage('inactive')).status, 409)
    a = await current()
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/staff/applications/' + a.id + '/allocation/update',
          { revision: a.revision, startDate: today, endDate: '2020-01-01' },
        )
      ).status,
      400,
    )
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/staff/applications/' + a.id + '/allocation/update',
          {
            revision: a.revision,
            startDate: today,
            endDate: '2099-02-01',
            note: 'Updated private arrangement',
          },
        )
      ).status,
      200,
    )
    assert.equal(
      (
        await request('POST', '/api/portal/staff/greyhounds', {
          ...dog,
          status: 'available',
        })
      ).status,
      409,
    )
    const assignedDog = (
      await request('GET', '/api/portal/staff/greyhounds?q=FULL-1')
    ).body.greyhounds[0]
    assert.equal(
      (
        await request('POST', '/api/portal/staff/greyhounds', {
          ...assignedDog,
          feedingInformation: 'New feeding plan',
        })
      ).status,
      200,
    )
    a = await current()
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/staff/applications/' + a.id + '/allocation/end',
          {
            revision: a.revision,
            status: 'returned_early',
            returnDate: '2099-01-01',
          },
        )
      ).status,
      400,
    )
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/staff/applications/' + a.id + '/allocation/end',
          { revision: a.revision, status: 'returned_early', returnDate: today },
        )
      ).status,
      200,
    )
    const history = (
      await request(
        'GET',
        '/api/portal/staff/applications/' + a.id + '/allocations',
      )
    ).body.allocations
    assert.equal(history[0].note, 'Updated private arrangement')
    assert.equal(history[0].returnedAt, today)
    assert.ok(history[0].staffName)
    assert.equal((await manage('inactive')).status, 200)
    assert.ok((await current()).approvalDate)
    assert.equal(
      (await request('GET', '/api/portal/resources', undefined, carer)).status,
      403,
    )
  })
  it('supports owned withdrawal, prevents repeat decisions and audits the change', async () => {
    const other = await applicant('withdraw@example.test')
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/applications/' + other.id + '/withdraw',
          {},
          carer,
        )
      ).status,
      404,
    )
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/applications/' + other.id + '/withdraw',
          {},
          other.token,
        )
      ).status,
      200,
    )
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/applications/' + other.id + '/withdraw',
          {},
          other.token,
        )
      ).status,
      409,
    )
    const a = (
      await request('GET', '/api/portal/staff/applications/' + other.id)
    ).body.application
    assert.equal(a.status, 'withdrawn')
    assert.equal(
      (
        await request(
          'POST',
          '/api/portal/staff/applications/' + other.id + '/decision',
          { decision: 'approved', revision: a.revision },
        )
      ).status,
      409,
    )
  })
  it('imports genuine Excel data and records row failures without erasing omitted care fields', async () => {
    const workbook = new ExcelJS.Workbook(),
      sheet = workbook.addWorksheet('Greyhounds')
    sheet.addRows([
      ['id', 'name', 'age', 'sex', 'compatibleWithCats'],
      ['XLSX-1', 'Excel Buddy', 0, 'Male', false],
      ['XLSX-2', 'Invalid Buddy', 40, 'Female', true],
    ])
    const base64 = Buffer.from(await workbook.xlsx.writeBuffer()).toString(
      'base64',
    )
    const preview = await request('POST', '/api/portal/staff/import', {
      fileName: 'dogs.xlsx',
      base64,
    })
    assert.equal(preview.status, 200)
    assert.equal(preview.body.successful, 1)
    assert.equal(preview.body.failed, 1)
    const saved = await request('POST', '/api/portal/staff/import', {
      fileName: 'dogs.xlsx',
      base64,
      confirm: true,
    })
    assert.ok(saved.body.batchId)
    const excelDog = (
      await request('GET', '/api/portal/staff/greyhounds?q=XLSX-1')
    ).body.greyhounds[0]
    assert.equal(excelDog.age, 0)
    assert.equal(excelDog.compatibleWithCats, 0)
    const report = await request(
      'GET',
      '/api/portal/staff/import/' + saved.body.batchId + '/errors.csv',
    )
    assert.equal(parse(report.body, { bom: true }).length, 2)
    const update = await request('POST', '/api/portal/staff/import', {
      fileName: 'update.csv',
      text: 'id,name,age,sex\nFULL-1,Renamed Buddy,3,Unknown',
      confirm: true,
      overwrite: true,
    })
    assert.equal(update.body.successful, 1)
    assert.equal(
      (await request('GET', '/api/portal/staff/greyhounds?q=FULL-1')).body
        .greyhounds[0].feedingInformation,
      'New feeding plan',
    )
    assert.equal(
      (await request('GET', '/api/portal/staff/import-history')).body.batches
        .length,
      2,
    )
  })
  it('rejects disguised Excel files, formulas, macros and oversize uploads', async () => {
    for (const body of [
      {
        fileName: 'bad.xlsx',
        base64: Buffer.from('not a zip').toString('base64'),
      },
      { fileName: 'macro.xlsm', base64: 'AAAA' },
      { fileName: 'big.csv', text: 'a'.repeat(1024 * 1024 + 1) },
    ])
      assert.equal(
        (await request('POST', '/api/portal/staff/import', body)).status,
        400,
      )
    const workbook = new ExcelJS.Workbook(),
      sheet = workbook.addWorksheet('Dogs')
    sheet.addRows([
      ['id', 'name', 'age', 'sex'],
      ['F-1', { formula: '1+1', result: 2 }, 3, 'Male'],
    ])
    assert.equal(
      (
        await request('POST', '/api/portal/staff/import', {
          fileName: 'formula.xlsx',
          base64: Buffer.from(await workbook.xlsx.writeBuffer()).toString(
            'base64',
          ),
        })
      ).status,
      400,
    )
  })
  it('exports filtered CSV and Excel with all required columns and formula-safe values', async () => {
    const csv = await request(
      'GET',
      '/api/portal/staff/reports.csv?status=withdrawn',
    )
    const rows = parse(csv.body, { bom: true })
    assert.equal(rows.length, 2)
    assert.equal(rows[0].length, 11)
    assert.equal(rows[1][5], 'withdrawn')
    assert.equal(csvCell(' \t=HYPERLINK("bad")')[1], "'")
    assert.equal(
      parse(csvDocument(['A'], [['line 1\nline 2']]), { bom: true })[1][0],
      'line 1\nline 2',
    )
    const excel = await request(
      'GET',
      '/api/portal/staff/reports.xlsx?status=inactive',
    )
    assert.equal(excel.status, 200)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(excel.body)
    assert.equal(workbook.worksheets[0].rowCount, 2)
    assert.equal(workbook.worksheets[0].getCell('D2').value, '0499999999')
    assert.equal(
      (await request('GET', '/api/portal/staff/reports.csv?from=2024-02-30'))
        .status,
      400,
    )
    assert.equal(
      (await request('GET', '/api/portal/staff/report-summary')).body.summary
        .received,
      2,
    )
  })
  it('restricts administration, provisions SSO staff and protects administrator access', async () => {
    for (const route of [
      'users',
      'templates',
      'settings',
      'audit',
      'maintenance',
    ])
      assert.equal(
        (await request('GET', '/api/portal/admin/' + route, undefined, staff))
          .status,
        403,
      )
    assert.equal(
      (
        await request('POST', '/api/portal/admin/users', {
          email: 'newstaff@gap.test',
          name: 'New Staff',
          microsoftId: randomUUID(),
          role: 'staff',
        })
      ).status,
      200,
    )
    const users = (await request('GET', '/api/portal/admin/users')).body.users
    assert.equal(
      users.some((u) => 'password_hash' in u),
      false,
    )
    createdStaff = users.find((u) => u.email === 'newstaff@gap.test')
    const me = (await request('GET', '/api/auth/me')).body.user
    assert.equal(
      (
        await request('POST', '/api/portal/admin/users', {
          id: me.id,
          status: 'disabled',
        })
      ).status,
      409,
    )
    assert.equal(
      (
        await request('POST', '/api/portal/admin/users', {
          id: application.userId,
          role: 'admin',
        })
      ).status,
      400,
    )
    const token = createAccessToken(findPublicUserById(createdStaff.id))
    assert.equal(
      (
        await request('POST', '/api/portal/admin/users', {
          id: createdStaff.id,
          status: 'disabled',
        })
      ).status,
      200,
    )
    assert.equal(
      (await request('GET', '/api/portal/staff/directory', undefined, token))
        .status,
      401,
    )
    assert.equal(
      (
        await request(
          'POST',
          '/api/auth/login',
          { email: createdStaff.email, password: 'anything' },
          null,
        )
      ).status,
      403,
    )
  })
  it('renders edited email templates and rejects unsafe headers or missing reset links', async () => {
    assert.equal(
      (
        await request('POST', '/api/portal/admin/templates/withdrawal', {
          subject: 'Update {{name}}',
          body: 'Application {{applicationId}} withdrawn.',
        })
      ).status,
      200,
    )
    const { renderEmailTemplate } =
      await import('../integrations/emailTemplates.js')
    assert.equal(
      renderEmailTemplate('withdrawal', {
        name: 'Taylor',
        applicationId: 'ABC',
      }).subject,
      'Update Taylor',
    )
    assert.equal(
      (
        await request('POST', '/api/portal/admin/templates/approval', {
          subject: 'Bad\r\nHeader',
          body: 'body',
        })
      ).status,
      400,
    )
    assert.equal(
      (
        await request('POST', '/api/portal/admin/templates/password_reset', {
          subject: 'Reset',
          body: 'No link',
        })
      ).status,
      400,
    )
    assert.equal(
      (
        await request('POST', '/api/portal/admin/templates/approval', {
          subject: 'Update',
          body: '{{password}}',
        })
      ).status,
      400,
    )
  })
  it('queues one weekly report per local date with a durable CSV attachment only for staff', async () => {
    const me = (await request('GET', '/api/auth/me')).body.user
    assert.equal(
      (
        await request('POST', '/api/portal/admin/settings', {
          weeklyEnabled: true,
          weeklyRecipients: [application.userId],
        })
      ).status,
      400,
    )
    assert.equal(
      (
        await request('POST', '/api/portal/admin/settings', {
          contactEmail: 'contact@gap.test',
          weeklyEnabled: true,
          weeklyRecipients: [me.id],
        })
      ).status,
      200,
    )
    assert.equal(
      (await request('POST', '/api/portal/admin/weekly-report', {})).body
        .queued,
      true,
    )
    assert.equal(
      (await request('POST', '/api/portal/admin/weekly-report', {})).body
        .alreadyQueued,
      true,
    )
    const attachments = getDatabase()
      .prepare(
        "SELECT a.content FROM portal_notification_attachments a JOIN notifications n ON n.id = a.notification_id WHERE n.notification_type = 'weekly_report'",
      )
      .all()
    assert.equal(attachments.length, 1)
    assert.equal(parse(attachments[0].content, { bom: true }).length, 3)
    assert.equal(
      (await request('GET', '/api/portal/public', undefined, null)).body
        .settings.contactEmail,
      'contact@gap.test',
    )
  })
  it('creates integrity-checked backups and restores only into a new database file', async () => {
    const created = await request('POST', '/api/portal/admin/backup', {})
    assert.equal(created.status, 200)
    const source = path.join(temp, 'backups', created.body.filename),
      target = path.join(temp, 'restored.sqlite')
    const restore = spawnSync(
      process.execPath,
      ['server/scripts/restore-db.js', '--source', source, '--target', target],
      { encoding: 'utf8' },
    )
    assert.equal(restore.status, 0, restore.stderr)
    const restored = new DatabaseSync(target, { readOnly: true })
    assert.equal(
      restored.prepare('SELECT count(*) AS n FROM foster_applications').get().n,
      2,
    )
    assert.equal(
      restored.prepare('PRAGMA integrity_check').get().integrity_check,
      'ok',
    )
    restored.close()
    assert.notEqual(
      spawnSync(
        process.execPath,
        [
          'server/scripts/restore-db.js',
          '--source',
          source,
          '--target',
          target,
        ],
        { encoding: 'utf8' },
      ).status,
      0,
    )
  })
  it('migrates old notification constraints without losing content or application visibility', () => {
    const migrationFile = path.join(temp, 'migration.sqlite'),
      db = new DatabaseSync(migrationFile)
    const schema = fs
      .readFileSync(config.schemaFile, 'utf8')
      .replace(/,\s*'withdrawal',\s*'weekly_report'/, '')
    try {
      db.exec(schema)
      assert.equal(
        db
          .prepare("SELECT sql FROM sqlite_schema WHERE name = 'notifications'")
          .get()
          .sql.includes("'weekly_report'"),
        false,
      )
      db.exec(
        fs.readFileSync(
          new URL('../database/integration.sql', import.meta.url),
          'utf8',
        ),
      )
      const id = randomUUID()
      db.prepare(
        "INSERT INTO notifications (id,recipient_email,notification_type,subject) VALUES (?,'recipient@gap.test','password_reset','Reset')",
      ).run(id)
      db.prepare(
        'INSERT INTO portal_notification_content (notification_id,body) VALUES (?,?)',
      ).run(id, 'Preserved message')
      initializeDatabase(db)
      assert.equal(
        db
          .prepare(
            'SELECT body FROM portal_notification_content WHERE notification_id = ?',
          )
          .get(id).body,
        'Preserved message',
      )
      db.prepare(
        "INSERT INTO notifications (id,recipient_email,notification_type,subject) VALUES (?,'recipient@gap.test','weekly_report','Weekly')",
      ).run(randomUUID())
      assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [])
      const userId = randomUUID(),
        applicantId = randomUUID(),
        legacyId = randomUUID()
      db.prepare(
        "INSERT INTO users (id,email,role_id) VALUES (?,'legacy@test.example','applicant')",
      ).run(userId)
      db.prepare(
        "INSERT INTO applicants (id,user_id,first_name,last_name) VALUES (?,?,'Legacy','Applicant')",
      ).run(applicantId, userId)
      db.prepare(
        "INSERT INTO foster_applications (id,applicant_id,application_status) VALUES (?,?,'submitted')",
      ).run(legacyId, applicantId)
      initializeDatabase(db)
      assert.equal(
        JSON.parse(
          db
            .prepare(
              'SELECT form_json FROM portal_application_state WHERE application_id = ?',
            )
            .get(legacyId).form_json,
        ).fullName,
        'Legacy Applicant',
      )
    } finally {
      db.close()
    }
  })
  it('records attempts and exports in the searchable admin audit and rejects cross-origin mutations', async () => {
    const audit = await request(
      'GET',
      '/api/portal/admin/audit?q=report.exported',
    )
    assert.equal(audit.status, 200)
    assert.equal(audit.body.total, 2)
    assert.ok(JSON.parse(audit.body.audit[0].current).format)
    assert.equal(
      (await request('GET', '/api/health', undefined, null)).headers.get(
        'x-content-type-options',
      ),
      'nosniff',
    )
    const invalidOrigin = await fetch(
      base + '/api/portal/admin/weekly-report',
      {
        method: 'POST',
        headers: {
          origin: 'https://malicious.example',
          authorization: 'Bearer ' + admin,
          'content-type': 'application/json',
        },
        body: '{}',
      },
    )
    assert.equal(invalidOrigin.status, 403)
    const previous = config.production
    config.production = true
    try {
      assert.equal(
        (await request('GET', '/api/portal/public', undefined, null)).status,
        403,
      )
    } finally {
      config.production = previous
    }
  })
})
