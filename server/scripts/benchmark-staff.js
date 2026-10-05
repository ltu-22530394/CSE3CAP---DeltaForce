// Reproducible local HTTP benchmark. Uses only an isolated synthetic database.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gap-perf-'))
process.env.GAPS_DB_FILE = path.join(dir, 'benchmark.sqlite')
process.env.JWT_SECRET = 'isolated-benchmark-key-not-for-deployment'
process.env.MAIL_WORKER_ENABLED = 'false'
const count = Number(process.env.BENCH_APPLICATIONS || 1000)
const samples = 30
const { createApp } = await import('../app.js')
const { getDatabase, withTransaction, closeDatabase } = await import('../database/db.js')
const { createAccessToken } = await import('../utils/jwt.js')
const app = createApp()
const db = getDatabase()
withTransaction(() => {
  db.prepare("INSERT INTO users(id,email,role_id) VALUES ('bench-staff','staff@example.test','staff')").run()
  const user = db.prepare("INSERT INTO users(id,email) VALUES (?,?)")
  const applicant = db.prepare("INSERT INTO applicants(id,user_id,first_name,last_name) VALUES (?,?,?,?)")
  const application = db.prepare("INSERT INTO foster_applications(id,applicant_id,application_status,submitted_at) VALUES (?,?,'submitted',?)")
  const note = db.prepare("INSERT INTO application_notes(id,application_id,created_by_user_id,note_text,visible_to_applicant) VALUES (?,?,'bench-staff',?,1)")
  for (let i = 0; i < count; i++) {
    user.run(`user-${i}`, `applicant${i}@example.test`)
    applicant.run(`person-${i}`, `user-${i}`, 'Synthetic', `Applicant ${i}`)
    application.run(`app-${i}`, `person-${i}`, '2026-09-25T10:00:00.000Z')
    for (let j = 0; j < 3; j++) note.run(`note-${i}-${j}`, `app-${i}`, `[status:in_review] Synthetic review ${j}`)
  }
})
const server = app.listen(0, '127.0.0.1')
await new Promise(resolve => server.once('listening', resolve))
const base = `http://127.0.0.1:${server.address().port}`
const token = createAccessToken({ id: 'bench-staff', email: 'staff@example.test', role: 'staff' })
const results = []
async function request(url, expectedCount) {
  const start = performance.now()
  const response = await fetch(base + url, { headers: { authorization: `Bearer ${token}` } })
  const text = await response.text()
  assert.equal(response.status, 200)
  const body = JSON.parse(text)
  if (expectedCount !== undefined) assert.equal(body.applications.length, expectedCount)
  return { ms: performance.now() - start, bytes: Buffer.byteLength(text) }
}
try {
  for (const [name, url, expected, concurrency] of [
    ['staff-list', '/api/staff/portal/applications', count, 1],
    ['staff-search', '/api/staff/portal/applications?q=applicant999@example.test', count >= 1000 ? 1 : 0, 1],
    ['staff-detail', '/api/staff/portal/applications/app-0', undefined, 1],
    ['staff-list-5-concurrent', '/api/staff/portal/applications', count, 5],
  ]) {
    for (let i = 0; i < 3; i++) await request(url, expected)
    const measurements = []
    for (let i = 0; i < samples; i += concurrency) {
      measurements.push(...await Promise.all(Array.from({ length: concurrency }, () => request(url, expected))))
    }
    const times = measurements.map(item => item.ms).sort((a, b) => a - b)
    results.push({ name, concurrency, samples, medianMs: +times[14].toFixed(2), p95Ms: +times[28].toFixed(2), maxMs: +times[29].toFixed(2), responseBytes: measurements[0].bytes })
  }
  console.log(JSON.stringify({ measuredAt: new Date().toISOString(), node: process.version, platform: `${os.platform()} ${os.arch()}`, cpu: os.cpus()[0].model, applications: count, notesPerApplication: 3, warmups: 3, transport: 'localhost HTTP including body read and JSON parse; no TLS or browser render', results }, null, 2))
} finally {
  await new Promise(resolve => server.close(resolve))
  closeDatabase()
  fs.rmSync(dir, { recursive: true, force: true })
}
