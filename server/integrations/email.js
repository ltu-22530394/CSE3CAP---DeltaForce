import { randomUUID } from 'node:crypto'
import { config } from '../config.js'
import { getDatabase } from '../database/db.js'
import { renderEmailTemplate } from './emailTemplates.js'
import { portalSettings } from '../repositories/settingsRepository.js'

// Preserve the business notification history without contacting an email provider.
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
  ).run(
    id,
    user.id,
    user.email,
    type,
    subject,
    applicationId,
    allocationId,
  )
  db.prepare(
    'INSERT INTO portal_notification_content (notification_id, body) VALUES (?, ?)',
  ).run(id, body)
  if (attachment)
    db.prepare(
      'INSERT INTO portal_notification_attachments (notification_id, filename, content, content_type) VALUES (?, ?, ?, ?)',
    ).run(
      id,
      attachment.filename,
      attachment.content,
      attachment.contentType,
    )
  return id
}

// Existing business actions can still finish flushing without sending mail.
export async function flushEmails() {
  return
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
