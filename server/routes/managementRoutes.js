import { Router } from 'express'
import { getDatabase } from '../database/db.js'
import {
  requireAuth,
  requireApplicant,
  requireStaff,
  requireRole,
} from '../middleware/authMiddleware.js'
import { asyncRoute } from '../utils/apiError.js'
import {
  applicantProfile,
  saveApplicantProfile,
  staffDirectory,
  listUsers,
  saveUser,
  manageApplication,
  withdrawApplication,
  updateAllocation,
} from '../repositories/managementRepository.js'
import {
  publicSettings,
  portalSettings,
  saveSettings,
} from '../repositories/settingsRepository.js'
import { saveEmailTemplate } from '../integrations/emailTemplates.js'
import { flushEmails } from '../integrations/email.js'
import {
  reportSummary,
  exportReport,
} from '../repositories/reportRepository.js'
import { createBackup, weeklyReport } from '../maintenance.js'

export const managementRouter = Router()
managementRouter.get('/public', (_req, res) =>
  res.json({
    settings: publicSettings(),
    resources: getDatabase()
      .prepare(
        'SELECT id, title, description, resource_type AS type, resource_url AS url FROM training_resources WHERE active = 1 AND requires_approval = 0 ORDER BY display_order, title',
      )
      .all(),
  }),
)
managementRouter.get('/profile', requireAuth, requireApplicant, (req, res) =>
  res.json({ profile: applicantProfile(req.user) }),
)
managementRouter.post('/profile', requireAuth, requireApplicant, (req, res) =>
  res.json({ profile: saveApplicantProfile(req.user, req.body) }),
)
managementRouter.post(
  '/applications/:id/withdraw',
  requireAuth,
  requireApplicant,
  asyncRoute(async (req, res) => {
    withdrawApplication(req.user, req.params.id)
    await flushEmails()
    res.json({ message: 'Application withdrawn.' })
  }),
)
managementRouter.get(
  '/staff/directory',
  requireAuth,
  requireStaff,
  (_req, res) => res.json({ staff: staffDirectory() }),
)
managementRouter.post(
  '/staff/applications/:id/manage',
  requireAuth,
  requireStaff,
  (req, res) =>
    res.json({
      application: manageApplication(req.user, req.params.id, req.body),
    }),
)
managementRouter.post(
  '/staff/applications/:id/allocation/update',
  requireAuth,
  requireStaff,
  (req, res) =>
    res.json({
      application: updateAllocation(req.user, req.params.id, req.body),
    }),
)
managementRouter.get(
  '/staff/report-summary',
  requireAuth,
  requireStaff,
  (req, res) => res.json({ summary: reportSummary(req.query) }),
)
managementRouter.get(
  '/staff/reports.xlsx',
  requireAuth,
  requireStaff,
  asyncRoute(async (req, res) =>
    res
      .type(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .attachment('application-status.xlsx')
      .send(Buffer.from(await exportReport(req.user, req.query, 'xlsx'))),
  ),
)
managementRouter.get(
  '/staff/import-history',
  requireAuth,
  requireStaff,
  (_req, res) =>
    res.json({
      batches: getDatabase()
        .prepare(
          'SELECT b.*, s.full_name AS staffName FROM greyhound_import_batches b LEFT JOIN staff_profiles s ON s.user_id = b.imported_by_user_id ORDER BY b.created_at DESC, b.rowid DESC LIMIT 100',
        )
        .all(),
    }),
)
managementRouter.use('/admin', requireAuth, requireRole('admin'))
managementRouter.get('/admin/users', (req, res) =>
  res.json({ users: listUsers(req.query) }),
)
managementRouter.post(
  '/admin/users',
  asyncRoute(async (req, res) =>
    res.json({ id: await saveUser(req.user, req.body) }),
  ),
)
managementRouter.get('/admin/templates', (_req, res) =>
  res.json({
    templates: getDatabase()
      .prepare(
        'SELECT template_key AS key, subject, body FROM email_templates ORDER BY template_key',
      )
      .all(),
  }),
)
managementRouter.post('/admin/templates/:key', (req, res) => {
  saveEmailTemplate(req.user, req.params.key, req.body)
  res.json({ message: 'Email template saved.' })
})
managementRouter.get('/admin/settings', (_req, res) =>
  res.json({ settings: portalSettings() }),
)
managementRouter.post('/admin/settings', (req, res) =>
  res.json({ settings: saveSettings(req.user, req.body) }),
)
managementRouter.get('/admin/audit', (req, res) => {
  const q = String(req.query.q || '')
      .trim()
      .slice(0, 160),
    page = Math.max(1, Math.floor(Number(req.query.page) || 1)),
    offset = (page - 1) * 50
  const where = "WHERE (? = '' OR action LIKE ? OR entity_id LIKE ?)"
  const args = [q, '%' + q + '%', '%' + q + '%']
  res.json({
    total: getDatabase()
      .prepare('SELECT count(*) AS n FROM audit_logs ' + where)
      .get(...args).n,
    audit: getDatabase()
      .prepare(
        `SELECT a.id, a.actor_user_id AS actorId, a.action, a.entity_type AS entityType, a.entity_id AS entityId, a.previous_value_json AS previous, a.new_value_json AS current, a.created_at AS createdAt, COALESCE(s.full_name, u.email) AS actorName FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id LEFT JOIN staff_profiles s ON s.user_id = u.id ${where} ORDER BY a.created_at DESC, a.rowid DESC LIMIT 50 OFFSET ?`,
      )
      .all(...args, offset),
  })
})
managementRouter.get('/admin/maintenance', (_req, res) =>
  res.json({
    runs: getDatabase()
      .prepare(
        'SELECT id, kind, status, result_json AS result, created_at AS createdAt, finished_at AS finishedAt FROM maintenance_runs ORDER BY created_at DESC, rowid DESC LIMIT 50',
      )
      .all(),
  }),
)
managementRouter.post(
  '/admin/backup',
  asyncRoute(async (req, res) => res.json(await createBackup(req.user))),
)
managementRouter.post(
  '/admin/weekly-report',
  asyncRoute(async (req, res) => res.json(await weeklyReport(req.user))),
)
