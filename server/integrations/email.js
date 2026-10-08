import { randomUUID } from 'node:crypto'
import nodemailer from 'nodemailer'
import { config } from '../config.js'
import { getDatabase } from '../database/db.js'
import { renderEmailTemplate } from './emailTemplates.js'
import { portalSettings } from '../repositories/settingsRepository.js'

let transport
const deliveries = new Map()
export function emailTransport() {
  if (!transport)
    transport = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      requireTLS: config.production && !config.smtpSecure,
      auth: config.smtpUser
        ? { user: config.smtpUser, pass: config.smtpPassword }
        : undefined,
      connectionTimeout: 10000,
      socketTimeout: 10000,
      disableFileAccess: true,
      disableUrlAccess: true,
    })
  return transport
}

export function queueEmail({
  user,
  type,
  subject,
  body,
  applicationId = null,
  allocationId = null,
  attachment = null,
}) {
  const db = getDatabase()
  const id = randomUUID()
  db.prepare(
    `INSERT INTO notifications (id, recipient_user_id, recipient_email, notification_type, subject, related_application_id, related_allocation_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, user.id, user.email, type, subject, applicationId, allocationId)
  db.prepare(
    'INSERT INTO portal_notification_content (notification_id, body) VALUES (?, ?)',
  ).run(id, body)
  if (attachment)
    db.prepare(
      'INSERT INTO portal_notification_attachments (notification_id, filename, content, content_type) VALUES (?, ?, ?, ?)',
    ).run(id, attachment.filename, attachment.content, attachment.contentType)
  return id
}

async function performDelivery(id) {
  if (config.emailMode === 'preview' && !config.production) return
  const db = getDatabase()
  const item = db
    .prepare(
      'SELECT n.*, c.body FROM notifications n JOIN portal_notification_content c ON c.notification_id = n.id WHERE n.id = ?',
    )
    .get(id)
  if (!item || item.delivery_status === 'sent') return
  try {
    if (config.emailMode !== 'smtp' || !config.smtpHost)
      throw new Error('SMTP is not configured.')
    const attachment = db
      .prepare(
        'SELECT * FROM portal_notification_attachments WHERE notification_id = ?',
      )
      .get(id)
    const result = await emailTransport().sendMail({
      from: config.emailFrom,
      to: item.recipient_email,
      subject: item.subject,
      text: item.body,
      attachments: attachment
        ? [
            {
              filename: attachment.filename,
              content: attachment.content,
              contentType: attachment.content_type,
            },
          ]
        : undefined,
    })
    if (!result.accepted?.length)
      throw new Error('The email server did not accept the recipient.')
    db.prepare(
      "UPDATE notifications SET delivery_status = 'sent', sent_at = datetime('now'), error_message = NULL WHERE id = ?",
    ).run(id)
  } catch {
    db.prepare(
      "UPDATE notifications SET delivery_status = 'failed', error_message = 'Email delivery failed. Check SMTP configuration and retry.' WHERE id = ?",
    ).run(id)
  }
}

export async function deliverEmail(id) {
  if (deliveries.has(id)) return deliveries.get(id)
  const delivery = performDelivery(id)
  deliveries.set(id, delivery)
  try {
    await delivery
  } finally {
    deliveries.delete(id)
  }
}

export async function flushEmails() {
  const items = getDatabase()
    .prepare(
      "SELECT id FROM notifications WHERE delivery_status = 'pending' ORDER BY created_at LIMIT 50",
    )
    .all()
  for (const item of items) await deliverEmail(item.id)
}

export function applicationEmail(
  user,
  applicationId,
  type,
  message,
  allocationId = null,
) {
  const template = renderEmailTemplate(type, {
    applicationId,
    name: user.fullName,
    link: config.appOrigin + '/applicant',
  })
  const settings = portalSettings()
  const contact = [settings.contactEmail, settings.contactPhone]
    .filter(Boolean)
    .join(' | ')
  return queueEmail({
    user,
    type,
    subject: template.subject,
    body: `Hello ${user.fullName},\n\n${template.body}\n\n${message || ''}\n\n${config.appOrigin}/applicant\n\nGreyhounds as Pets${contact ? '\n' + contact : ''}`,
    applicationId,
    allocationId,
  })
}
