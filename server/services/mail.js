import {
  randomUUID,
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from 'node:crypto'
import nodemailer from 'nodemailer'
import { getDatabase } from '../database/db.js'
import { config } from '../config.js'

// Encrypt queued bodies because verification/reset messages contain bearer tokens.
function key() {
  return createHash('sha256')
    .update(process.env.MAIL_ENCRYPTION_KEY || config.jwtSecret)
    .digest()
}
function encrypt(text) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', key(), iv)
  return Buffer.concat([
    iv,
    cipher.update(text, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString('base64')
}
function decrypt(payload) {
  const bytes = Buffer.from(payload, 'base64'),
    cipher = createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12))
  cipher.setAuthTag(bytes.subarray(-16))
  return (
    cipher.update(bytes.subarray(12, -16), undefined, 'utf8') +
    cipher.final('utf8')
  )
}
export function queueMail(
  {
    userId,
    email,
    type,
    subject,
    text,
    eventKey,
    applicationId = null,
    allocationId = null,
  },
  db = getDatabase(),
) {
  const id = randomUUID()
  db.prepare(
    `INSERT OR IGNORE INTO notifications (id,recipient_user_id,recipient_email,notification_type,subject,related_application_id,related_allocation_id,event_key,encrypted_body) VALUES (?,?,?,?,?,?,?,?,?)`,
  ).run(
    id,
    userId,
    email,
    type,
    subject,
    applicationId,
    allocationId,
    eventKey,
    encrypt(text),
  )
  return id
}
export function queueApplicationMail(id, type, eventKey, db = getDatabase()) {
  const user = db
    .prepare(
      `SELECT u.id,u.email FROM users u JOIN applicants a ON a.user_id=u.id JOIN foster_applications f ON f.applicant_id=a.id WHERE f.id=?`,
    )
    .get(id)
  const labels = {
    application_confirmation: 'Application received',
    approval: 'Application approved',
    rejection: 'Application update',
    information_required: 'More information requested',
    allocation: 'Greyhound assignment confirmed',
  }
  queueMail(
    {
      userId: user.id,
      email: user.email,
      type,
      subject: labels[type],
      text: `${labels[type]}. Sign in to your GAP portal to view the details: ${config.appOrigin}${config.appBasePath}/login`,
      eventKey,
      applicationId: id,
    },
    db,
  )
}
export function createMailTransport() {
  if (
    process.env.MAIL_TRANSPORT === 'json' &&
    process.env.NODE_ENV !== 'production'
  )
    return nodemailer.createTransport({ jsonTransport: true })
  if (!process.env.SMTP_HOST || !process.env.MAIL_FROM)
    throw new Error('Configure SMTP_HOST and MAIL_FROM before delivering mail.')
  if (process.env.NODE_ENV === 'production' && !process.env.MAIL_ENCRYPTION_KEY)
    throw new Error('MAIL_ENCRYPTION_KEY is required in production.')
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    requireTLS: process.env.SMTP_SECURE !== 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 15000,
    socketTimeout: 30000,
  })
}
export async function deliverPendingMail(transport = createMailTransport()) {
  const db = getDatabase(),
    results = []
  const rows = db
    .prepare(
      `SELECT * FROM notifications WHERE delivery_status IN ('pending','failed') AND attempts < 5 AND (lease_until IS NULL OR lease_until < unixepoch()) AND (next_attempt_at IS NULL OR next_attempt_at <= unixepoch()) ORDER BY created_at LIMIT 50`,
    )
    .all()
  for (const row of rows) {
    const claimed = db
      .prepare(
        `UPDATE notifications SET lease_until=unixepoch()+300,attempts=attempts+1 WHERE id=? AND delivery_status IN ('pending','failed') AND (lease_until IS NULL OR lease_until < unixepoch())`,
      )
      .run(row.id)
    if (!claimed.changes) continue
    try {
      await transport.sendMail({
        from: process.env.MAIL_FROM || 'GAP Development <gap@example.test>',
        to: row.recipient_email,
        subject: row.subject,
        text: decrypt(row.encrypted_body),
        messageId: `<${row.id}@gap-notifications>`,
      })
      db.prepare(
        `UPDATE notifications SET delivery_status='sent',sent_at=datetime('now'),error_message=NULL,lease_until=NULL,encrypted_body=NULL WHERE id=?`,
      ).run(row.id)
      results.push({ id: row.id, status: 'sent' })
    } catch {
      // Never persist provider errors that may contain recipients, credentials or tokens.
      db.prepare(
        `UPDATE notifications SET delivery_status='failed',error_message='Delivery failed. Check mail service configuration and retry.',lease_until=NULL,next_attempt_at=unixepoch()+300 WHERE id=?`,
      ).run(row.id)
      results.push({ id: row.id, status: 'failed' })
    }
  }
  return results
}
