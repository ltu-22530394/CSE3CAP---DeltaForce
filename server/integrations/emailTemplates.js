import { randomUUID } from 'node:crypto'
import { getDatabase } from '../database/db.js'
import { ApiError } from '../utils/apiError.js'
import { recordAuditLog } from '../repositories/auditRepository.js'

const defaults = {
  application_confirmation: [
    'Application received',
    'Your foster application {{applicationId}} has been received. GAP staff will review it.',
  ],
  approval: [
    'Foster application approved',
    'Your application {{applicationId}} is approved. Sign in to access care resources. GAP staff will contact you.',
  ],
  information_required: [
    'Further information required',
    'Please sign in to respond to the request for application {{applicationId}}.',
  ],
  rejection: [
    'Application update',
    'GAP has completed its review of application {{applicationId}}.',
  ],
  withdrawal: [
    'Application withdrawn',
    'Your application {{applicationId}} has been withdrawn. Contact GAP with any questions.',
  ],
  allocation: [
    'Greyhound allocation confirmed',
    'Your greyhound placement for application {{applicationId}} is confirmed. GAP staff will contact you.',
  ],
  email_verification: [
    'Verify your GAP email address',
    'Verify your email address using this link: {{link}}. This link expires in 24 hours.',
  ],
  email_verified: [
    'Email address verified',
    'Your email address is verified. You can sign in at {{link}}.',
  ],
  password_reset: [
    'Reset your GAP password',
    'Reset your password using this link: {{link}}. This link expires in one hour.',
  ],
}
export function seedEmailTemplates() {
  const insert = getDatabase().prepare(
    'INSERT OR IGNORE INTO email_templates (id, template_key, subject, body) VALUES (?, ?, ?, ?)',
  )
  for (const [key, [subject, body]] of Object.entries(defaults))
    insert.run(randomUUID(), key, subject, body)
}
export function renderEmailTemplate(key, values = {}) {
  const row = getDatabase()
    .prepare(
      'SELECT subject, body FROM email_templates WHERE template_key = ? AND active = 1',
    )
    .get(key)
  const [subject, body] = defaults[key] || ['GAP notification', '']
  const replace = (text) =>
    text.replace(/\{\{(name|applicationId|link)\}\}/g, (_, field) =>
      String(values[field] || ''),
    )
  return {
    subject: replace(row?.subject || subject),
    body: replace(row?.body || body),
  }
}
export function saveEmailTemplate(user, key, input) {
  if (!Object.hasOwn(defaults, key))
    throw new ApiError(404, 'NOT_FOUND', 'Email template was not found.')
  const subject = String(input.subject || '').trim(),
    body = String(input.body || '').trim()
  if (
    !subject ||
    subject.length > 200 ||
    /[\r\n]/.test(subject) ||
    !body ||
    body.length > 10000
  )
    throw new ApiError(
      400,
      'VALIDATION',
      'Enter a subject (up to 200 characters) and body (up to 10,000 characters).',
    )
  const tokens = (subject + body).match(/\{\{[^}]+\}\}/g) || []
  if (
    tokens.some(
      (token) => !['{{name}}', '{{applicationId}}', '{{link}}'].includes(token),
    )
  )
    throw new ApiError(
      400,
      'VALIDATION',
      'Use only the supported name, applicationId and link placeholders.',
    )
  if (
    ['email_verification', 'password_reset'].includes(key) &&
    !body.includes('{{link}}')
  )
    throw new ApiError(
      400,
      'VALIDATION',
      'This template must include {{link}}.',
    )
  const previous = getDatabase()
    .prepare('SELECT subject, body FROM email_templates WHERE template_key = ?')
    .get(key)
  getDatabase()
    .prepare(
      "UPDATE email_templates SET subject = ?, body = ?, updated_at = datetime('now') WHERE template_key = ?",
    )
    .run(subject, body, key)
  recordAuditLog({
    actorUserId: user.id,
    action: 'email_template.updated',
    entityType: 'email_template',
    entityId: key,
    previousValue: previous,
    newValue: { subject, body },
  })
}
