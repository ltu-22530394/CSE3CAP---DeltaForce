import fs from 'node:fs/promises'
import path from 'node:path'
import { backup, DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import cron from 'node-cron'
import { config } from './config.js'
import { getDatabase, withTransaction } from './database/db.js'
import { portalSettings } from './repositories/settingsRepository.js'
import { applicationReport } from './repositories/reportRepository.js'
import { findPublicUserById } from './repositories/userRepository.js'
import { recordAuditLog } from './repositories/auditRepository.js'
import { queueEmail, flushEmails } from './integrations/email.js'
import { csvDocument } from './integrations/greyhoundImport.js'
import { ApiError } from './utils/apiError.js'

let backupInProgress = null
export async function createBackup(user = null) {
  if (backupInProgress) return backupInProgress
  backupInProgress = performBackup(user)
  try {
    return await backupInProgress
  } finally {
    backupInProgress = null
  }
}
async function performBackup(user) {
  const db = getDatabase(),
    id = randomUUID(),
    name = `gap-${new Date().toISOString().replaceAll(':', '-')}-${id.slice(0, 8)}.sqlite`
  await fs.mkdir(config.backupDir, { recursive: true, mode: 0o700 })
  db.prepare(
    "INSERT INTO maintenance_runs (id, kind, run_key, status) VALUES (?, 'backup', ?, 'running')",
  ).run(id, id)
  const target = path.join(config.backupDir, name)
  try {
    await backup(db, target)
    await fs.chmod(target, 0o600)
    const check = new DatabaseSync(target, { readOnly: true })
    try {
      if (
        check.prepare('PRAGMA integrity_check').get().integrity_check !==
          'ok' ||
        check.prepare('PRAGMA foreign_key_check').all().length
      )
        throw new Error('Backup integrity failed.')
    } finally {
      check.close()
    }
    db.prepare(
      "UPDATE maintenance_runs SET status = 'completed', result_json = ?, finished_at = datetime('now') WHERE id = ?",
    ).run(JSON.stringify({ filename: name }), id)
    recordAuditLog({
      actorUserId: user?.id || null,
      action: 'backup.completed',
      entityType: 'backup',
      entityId: id,
      newValue: { filename: name },
    })
    return { id, filename: name }
  } catch {
    db.prepare(
      "UPDATE maintenance_runs SET status = 'failed', finished_at = datetime('now') WHERE id = ?",
    ).run(id)
    throw new ApiError(
      500,
      'BACKUP_FAILED',
      'Backup failed. Check protected storage capacity and permissions.',
    )
  }
}
export async function weeklyReport(user = null, now = new Date()) {
  const settings = portalSettings()
  if (!settings.weeklyEnabled || !settings.weeklyRecipients.length)
    throw new ApiError(
      409,
      'REPORT_DISABLED',
      'Enable weekly reports and choose active staff recipients first.',
    )
  const end = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const start = new Date(end + 'T00:00:00Z')
  start.setUTCDate(start.getUTCDate() - 6)
  const from = start.toISOString().slice(0, 10),
    key = 'weekly:' + end
  const existing = getDatabase()
    .prepare('SELECT id FROM maintenance_runs WHERE run_key = ?')
    .get(key)
  if (existing) return { id: existing.id, alreadyQueued: true }
  const report = applicationReport({ from, to: end }),
    id = randomUUID()
  withTransaction((db) => {
    db.prepare(
      "INSERT INTO maintenance_runs (id, kind, run_key, status) VALUES (?, 'weekly_report', ?, 'running')",
    ).run(id, key)
    let recipients = 0
    for (const recipientId of settings.weeklyRecipients) {
      const recipient = findPublicUserById(recipientId)
      if (
        !recipient ||
        recipient.accountStatus !== 'active' ||
        !['staff', 'admin'].includes(recipient.role)
      )
        continue
      queueEmail({
        user: recipient,
        type: 'weekly_report',
        subject: `GAP weekly application report: ${from} to ${end}`,
        body: `Hello ${recipient.fullName},\n\nThe attached application status report contains ${report.rows.length} applications submitted from ${from} to ${end}. This report contains personal information and is for authorised GAP staff only.`,
        attachment: {
          filename: 'weekly-application-status.csv',
          content: csvDocument(report.columns, report.rows),
          contentType: 'text/csv',
        },
      })
      recipients++
    }
    if (!recipients)
      throw new ApiError(
        409,
        'NO_RECIPIENTS',
        'No active authorised recipients remain. Update weekly settings.',
      )
    db.prepare(
      "UPDATE maintenance_runs SET status = 'completed', result_json = ?, finished_at = datetime('now') WHERE id = ?",
    ).run(
      JSON.stringify({
        from,
        to: end,
        recipients,
        records: report.rows.length,
      }),
      id,
    )
    recordAuditLog({
      actorUserId: user?.id || null,
      action: 'report.weekly_queued',
      entityType: 'report',
      entityId: id,
      newValue: { from, to: end, recipients, records: report.rows.length },
    })
  })
  await flushEmails()
  return { id, queued: true }
}
export function startMaintenance() {
  const tasks = []
  if (config.backupEnabled)
    tasks.push(
      cron.schedule(
        '0 2 * * *',
        () =>
          createBackup().catch(() => console.error('Scheduled backup failed.')),
        { timezone: config.timezone, noOverlap: true },
      ),
    )
  tasks.push(
    cron.schedule(
      '0 9 * * 1',
      () => {
        if (portalSettings().weeklyEnabled)
          return weeklyReport().catch(() =>
            console.error('Scheduled weekly report failed.'),
          )
      },
      { timezone: config.timezone, noOverlap: true },
    ),
  )
  tasks.push(
    cron.schedule('* * * * *', () => flushEmails(), { noOverlap: true }),
  )
  return () => tasks.forEach((task) => task.stop())
}
