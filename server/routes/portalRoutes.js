import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { config } from '../config.js'
import { getDatabase, withTransaction } from '../database/db.js'
import {
  requireAuth,
  requireApplicant,
  requireStaff,
  requireRole,
} from '../middleware/authMiddleware.js'
import { ApiError, asyncRoute } from '../utils/apiError.js'
import { validateRegistration } from '../utils/authValidation.js'
import { hashPassword } from '../utils/password.js'
import { createApplicantAccount } from '../repositories/userRepository.js'
import { recordAuditLog } from '../repositories/auditRepository.js'
import {
  cleanPortalForm,
  savePortalApplication,
  listApplicantApplications,
  applicantApplication,
  listStaffApplications,
  staffApplication,
  decideApplication,
  listGreyhounds,
  saveGreyhound,
  allocateGreyhound,
  endAllocation,
  applicationAllocationHistory,
} from '../repositories/portalRepository.js'
import { flushEmails } from '../integrations/email.js'
import {
  salesforceConfigured,
  fetchSalesforceGreyhounds,
} from '../integrations/salesforce.js'
import {
  importGreyhoundRows,
  csvDocument,
} from '../integrations/greyhoundImport.js'
import { parseGreyhoundFile } from '../integrations/spreadsheetImport.js'
import { exportReport } from '../repositories/reportRepository.js'

export const portalRouter = Router()

portalRouter.post(
  '/apply',
  asyncRoute(async (req, res) => {
    const form = cleanPortalForm(req.body?.form, true)
    const registration = validateRegistration({
      ...req.body,
      email: form.email,
      fullName: form.fullName,
      termsAccepted: form.termsAccepted,
      privacyConsent: form.privacyConsent,
    })
    const passwordHash = await hashPassword(registration.password)
    let application, user
    withTransaction(() => {
      user = createApplicantAccount({ ...registration, passwordHash })
      application = savePortalApplication(
        user,
        { form, currentStep: 3 },
        true,
      )
      recordAuditLog({
        actorUserId: user.id,
        action: 'account.created',
        entityType: 'user',
        entityId: user.id,
      })
    })
    await flushEmails()
    res.status(201).json({
      applicationId: application.id,
      message:
        'Application received. Sign in with your email and password.',
    })
  }),
)

portalRouter.use(requireAuth)
portalRouter.get('/applications', requireApplicant, (req, res) =>
  res.json({
    applications: listApplicantApplications(req.user.applicantId),
  }),
)
portalRouter.get('/applications/:id', requireApplicant, (req, res) =>
  res.json({
    application: applicantApplication(req.params.id, req.user.applicantId),
  }),
)
portalRouter.post(
  '/applications',
  requireApplicant,
  asyncRoute(async (req, res) => {
    res.status(201).json({
      application: savePortalApplication(
        req.user,
        req.body,
        req.body.submit === true,
      ),
    })
    await flushEmails()
  }),
)
portalRouter.post(
  '/applications/:id/information',
  requireApplicant,
  asyncRoute(async (req, res) => {
    const application = applicantApplication(
      req.params.id,
      req.user.applicantId,
    )
    const text = String(req.body?.text || '').trim()
    if (application.status !== 'more_information')
      throw new ApiError(
        409,
        'INVALID_TRANSITION',
        'No information request is open.',
      )
    if (text.length < 10 || text.length > 2000)
      throw new ApiError(
        400,
        'VALIDATION',
        'Provide between 10 and 2,000 characters.',
      )
    withTransaction((db) => {
      db.prepare(
        'INSERT INTO application_notes (id, application_id, created_by_user_id, note_text, visible_to_applicant) VALUES (?, ?, ?, ?, 1)',
      ).run(randomUUID(), application.id, req.user.id, text)
      db.prepare(
        "UPDATE foster_applications SET application_status = 'under_review', updated_at = datetime('now') WHERE id = ? AND application_status = 'information_required'",
      ).run(application.id)
      db.prepare(
        'UPDATE portal_application_state SET revision = revision + 1 WHERE application_id = ?',
      ).run(application.id)
      recordAuditLog({
        actorUserId: req.user.id,
        action: 'application.information_provided',
        entityType: 'application',
        entityId: application.id,
        newValue: {
          status: 'in_review',
          label: 'Additional information received',
          note: text,
        },
      })
    })
    res.json({
      application: applicantApplication(
        application.id,
        req.user.applicantId,
      ),
    })
  }),
)

portalRouter.get('/resources', requireApplicant, (req, res) => {
  const approved = getDatabase()
    .prepare(
      "SELECT 1 FROM foster_applications WHERE applicant_id = ? AND application_status = 'approved' LIMIT 1",
    )
    .get(req.user.applicantId)
  if (!approved)
    throw new ApiError(
      403,
      'NOT_APPROVED',
      'Care resources become available after approval.',
    )
  res.json({
    resources: getDatabase()
      .prepare(
        'SELECT id, title, description, resource_type AS type, resource_url AS url FROM training_resources WHERE active = 1 ORDER BY display_order, title',
      )
      .all(),
  })
})

portalRouter.use('/staff', requireStaff)
portalRouter.get('/staff/applications', (req, res) =>
  res.json({ applications: listStaffApplications(req.query) }),
)
portalRouter.get('/staff/applications/:id', (req, res) => {
  const application = staffApplication(req.params.id)
  if (application.status === 'draft')
    throw new ApiError(404, 'NOT_FOUND', 'Application could not be found.')
  res.json({ application })
})
portalRouter.post(
  '/staff/applications/:id/decision',
  asyncRoute(async (req, res) => {
    const application = decideApplication(
      req.user,
      req.params.id,
      req.body,
    )
    await flushEmails()
    res.json({ application })
  }),
)
portalRouter.get('/staff/greyhounds', (req, res) =>
  res.json({ greyhounds: listGreyhounds(req.query) }),
)
portalRouter.post('/staff/greyhounds', (req, res) =>
  res.json({ greyhound: saveGreyhound(req.user, req.body) }),
)
portalRouter.post(
  '/staff/applications/:id/allocation',
  asyncRoute(async (req, res) => {
    const application = allocateGreyhound(
      req.user,
      req.params.id,
      req.body,
    )
    await flushEmails()
    res.json({ application })
  }),
)
portalRouter.post('/staff/applications/:id/allocation/end', (req, res) =>
  res.json({
    application: endAllocation(req.user, req.params.id, req.body),
  }),
)
portalRouter.get('/staff/applications/:id/allocations', (req, res) =>
  res.json({ allocations: applicationAllocationHistory(req.params.id) }),
)
portalRouter.post(
  '/staff/import',
  asyncRoute(async (req, res) =>
    res.json(
      importGreyhoundRows(
        req.user,
        await parseGreyhoundFile(req.body),
        req.body,
      ),
    ),
  ),
)
portalRouter.get('/staff/import/:id/errors.csv', (req, res) => {
  const errors = getDatabase()
    .prepare(
      'SELECT row_number, error_message FROM greyhound_import_errors WHERE import_batch_id = ?',
    )
    .all(req.params.id)
  res
    .type('text/csv')
    .attachment('import-errors.csv')
    .send(
      csvDocument(
        ['Row', 'Error'],
        errors.map((row) => [row.row_number, row.error_message]),
      ),
    )
})
portalRouter.post(
  '/staff/salesforce/preview',
  asyncRoute(async (req, res) => {
    const rows = await fetchSalesforceGreyhounds()
    res.json({
      rows,
      summary: importGreyhoundRows(req.user, rows, {
        fileName: 'Salesforce API',
        overwrite: req.body?.overwrite === true,
      }),
    })
  }),
)
portalRouter.post('/staff/salesforce/import', (req, res) => {
  if (
    !Array.isArray(req.body?.rows) ||
    !req.body.rows.length ||
    req.body.rows.length > 5000
  )
    throw new ApiError(
      400,
      'VALIDATION',
      'Preview Salesforce data before importing.',
    )
  res.json(
    importGreyhoundRows(req.user, req.body.rows, {
      fileName: 'Salesforce API',
      confirm: true,
      overwrite: req.body.overwrite === true,
    }),
  )
})
portalRouter.get(
  '/staff/reports.csv',
  asyncRoute(async (req, res) => {
    res
      .type('text/csv')
      .attachment('application-status.csv')
      .send(await exportReport(req.user, req.query))
  }),
)

portalRouter.get('/staff/integrations', (_req, res) =>
  res.json({
    staffAuthentication: 'password',
    email: {
      configured: false,
      mode: config.emailMode,
    },
    salesforce: { configured: salesforceConfigured(), csv: true },
  }),
)
portalRouter.get('/staff/notifications', (_req, res) => {
  const db = getDatabase()
  const items = db
    .prepare(
      `SELECT n.id, n.recipient_email AS recipient, n.notification_type AS type, n.subject, n.delivery_status AS status, n.error_message AS error, n.created_at AS createdAt,
    NULL AS body FROM notifications n JOIN portal_notification_content c ON c.notification_id = n.id ORDER BY n.created_at DESC, n.rowid DESC LIMIT 100`,
    )
    .all()
  res.json({
    notifications: items.map((item) => ({
      ...item,
      status: item.status === 'sent' ? 'sent' : 'stored',
      error: null,
    })),
    preview: false,
  })
})
portalRouter.post('/staff/notifications/:id/retry', () => {
  throw new ApiError(
    410,
    'EMAIL_DISABLED',
    'Email delivery has been removed. Application updates are available in the portal.',
  )
})
portalRouter.get('/staff/resources', (_req, res) =>
  res.json({
    resources: getDatabase()
      .prepare(
        'SELECT id, title, description, resource_type AS type, resource_url AS url, active, requires_approval AS requiresApproval, display_order AS displayOrder FROM training_resources ORDER BY display_order, title',
      )
      .all(),
  }),
)
portalRouter.post('/staff/resources', requireRole('admin'), (req, res) => {
  const title = String(req.body?.title || '').trim(),
    url = String(req.body?.url || '').trim(),
    type = req.body?.type
  if (
    !title ||
    title.length > 160 ||
    !['youtube', 'vimeo', 'pdf', 'link', 'document'].includes(type)
  )
    throw new ApiError(
      400,
      'VALIDATION',
      'Enter a title and valid resource type.',
    )
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
      throw new Error()
  } catch {
    throw new ApiError(400, 'VALIDATION', 'Use an HTTPS resource link.')
  }
  const id = req.body.id || randomUUID()
  const db = getDatabase()
  if (
    req.body.displayOrder !== undefined &&
    (!Number.isInteger(req.body.displayOrder) ||
      req.body.displayOrder < 0 ||
      req.body.displayOrder > 10000)
  )
    throw new ApiError(
      400,
      'VALIDATION',
      'Use a display order from 0 to 10,000.',
    )
  if (
    req.body.id &&
    !db.prepare('SELECT id FROM training_resources WHERE id = ?').get(id)
  )
    throw new ApiError(404, 'NOT_FOUND', 'Resource could not be found.')
  const previous = db
    .prepare('SELECT * FROM training_resources WHERE id = ?')
    .get(id)
  withTransaction(() => {
    db.prepare(
      "INSERT INTO training_resources (id, title, description, resource_type, resource_url, active) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, description = excluded.description, resource_type = excluded.resource_type, resource_url = excluded.resource_url, active = excluded.active, updated_at = datetime('now')",
    ).run(
      id,
      title,
      String(req.body.description || '').slice(0, 2000),
      type,
      url,
      req.body.active === false ? 0 : 1,
    )
    db.prepare(
      'UPDATE training_resources SET requires_approval = ?, display_order = ? WHERE id = ?',
    ).run(
      Number(req.body.requiresApproval !== false),
      req.body.displayOrder || 0,
      id,
    )
    recordAuditLog({
      actorUserId: req.user.id,
      action: 'resource.saved',
      entityType: 'resource',
      entityId: id,
      previousValue: previous || null,
      newValue: {
        title,
        url,
        type,
        active: req.body.active !== false,
        requiresApproval: req.body.requiresApproval !== false,
        displayOrder: req.body.displayOrder || 0,
      },
    })
  })
  res.json({ id })
})
portalRouter.get('/staff/audit', requireRole('admin'), (_req, res) =>
  res.json({
    audit: getDatabase()
      .prepare(
        'SELECT id, actor_user_id AS actorId, action, entity_type AS entityType, entity_id AS entityId, created_at AS createdAt FROM audit_logs ORDER BY created_at DESC, rowid DESC LIMIT 100',
      )
      .all(),
  }),
)
