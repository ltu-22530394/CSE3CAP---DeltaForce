import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gap-list-parity-'))
process.env.GAPS_DB_FILE = path.join(dir, 'test.sqlite')
const { initializeDatabase, getDatabase, closeDatabase } = await import('../database/db.js')
const { listStaffApplications, getStaffApplication } = await import('../repositories/staffRepository.js')

test('batched staff lists preserve detail history, assignments, filters and private exclusions', () => {
  try {
    initializeDatabase()
    const db = getDatabase()
    db.exec(`INSERT INTO users(id,email,role_id) VALUES ('staff','staff@example.test','staff'),('owner','owner@example.test','applicant');
      INSERT INTO staff_profiles(user_id,full_name) VALUES ('staff','Test Reviewer');
      INSERT INTO applicants(id,user_id,first_name,last_name,address_line_1) VALUES ('person','owner','Alex','Example','12 Test Street');`)
    const statuses = ['submitted', 'approved', 'under_review', 'draft', 'withdrawn', 'inactive']
    for (const [i, status] of statuses.entries()) {
      db.prepare('INSERT INTO foster_applications(id,applicant_id,application_status,submitted_at,application_type) VALUES (?,?,?,?,?)').run(`app-${i}`, 'person', status, `2026-09-${20 + i}T10:00:00Z`, i === 1 ? 'adoption' : 'foster')
      for (let j = 0; j < 2; j++) {
        db.prepare('INSERT INTO application_notes(id,application_id,created_by_user_id,note_text,created_at) VALUES (?,?,?,?,?)').run(`note-${i}-${j}`, `app-${i}`, 'staff', `[status:in_review] Review ${j}`, '2026-09-25 10:00:00')
      }
    }
    db.exec(`INSERT INTO greyhounds(id,greyhound_identifier,name,sex,age_years) VALUES ('dog','SYN-1','Bluey','male',4);
      INSERT INTO greyhound_allocations(id,foster_carer_applicant_id,greyhound_id,allocated_by_user_id,allocation_status,application_id)
      VALUES ('allocation','person','dog','staff','confirmed','app-1');`)
    const list = listStaffApplications()
    assert.deepEqual(list.map(item => item.id), ['app-2', 'app-1', 'app-0'])
    for (const item of list) assert.deepEqual(item, getStaffApplication(item.id))
    assert.deepEqual(list[0].history.slice(1).map(note => note.note), ['Review 0', 'Review 1'])
    assert.equal(list[1].assignment.name, 'Bluey')
    assert.equal(list[1].assignment.assignedBy, 'Test Reviewer')
    assert.equal(list[0].assignment, undefined)
    assert.deepEqual(listStaffApplications({ status: 'in_progress' }).map(item => item.id), ['app-2'])
    assert.deepEqual(listStaffApplications({ type: 'Adoption' }).map(item => item.id), ['app-1'])
    assert.equal(listStaffApplications({ q: '12 TEST STREET' }).length, 3)
    assert.equal(listStaffApplications({ q: 'unmatched' }).length, 0)
    assert.deepEqual(listStaffApplications({ sort: 'oldest' }).map(item => item.id), ['app-0', 'app-1', 'app-2'])
  } finally {
    closeDatabase()
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
