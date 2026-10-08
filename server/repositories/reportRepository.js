import ExcelJS from 'exceljs'
import { getDatabase } from '../database/db.js'
import { listStaffApplications } from './portalRepository.js'
import { recordAuditLog } from './auditRepository.js'
import { csvDocument } from '../integrations/greyhoundImport.js'

export const reportColumns = [
  'Application ID',
  'Applicant',
  'Email',
  'Phone',
  'Submitted',
  'Status',
  'Approved',
  'Location',
  'Greyhound',
  'Greyhound ID',
  'Assigned staff',
]
export function applicationReport(filters = {}) {
  const records = listStaffApplications(filters)
  const rows = records.map((app) => [
    app.id,
    app.currentContact?.fullName || app.form.fullName,
    app.form.email,
    app.currentContact?.phone || app.form.phone,
    app.submittedAt,
    app.status,
    app.approvalDate,
    app.currentContact?.suburb || app.form.suburb,
    app.assignment?.name,
    app.assignment?.greyhoundId,
    app.assignedStaffName,
  ])
  return { columns: reportColumns, rows, records }
}
export function reportSummary(filters = {}) {
  const apps = listStaffApplications(filters),
    db = getDatabase()
  const completed = apps.filter((app) =>
    ['approved', 'rejected'].includes(app.status),
  )
  const days = completed.map(
    (app) =>
      (new Date(
        app.history
          .filter((event) => ['approved', 'rejected'].includes(event.status))
          .at(-1)?.at || app.updatedAt,
      ) -
        new Date(app.submittedAt)) /
      86400000,
  )
  return {
    received: apps.length,
    underReview: apps.filter((app) =>
      ['in_review', 'more_information'].includes(app.status),
    ).length,
    approved: apps.filter((app) => app.status === 'approved').length,
    rejected: apps.filter((app) => app.status === 'rejected').length,
    approvedCarers: db
      .prepare(
        "SELECT count(DISTINCT applicant_id) AS n FROM foster_applications WHERE application_status = 'approved'",
      )
      .get().n,
    availableGreyhounds: db
      .prepare(
        "SELECT count(*) AS n FROM greyhounds g WHERE availability_status = 'available' AND NOT EXISTS(SELECT 1 FROM greyhound_allocations a WHERE a.greyhound_id = g.id AND a.allocation_status IN ('proposed','confirmed','active'))",
      )
      .get().n,
    allocatedGreyhounds: db
      .prepare(
        "SELECT count(DISTINCT greyhound_id) AS n FROM greyhound_allocations WHERE allocation_status IN ('proposed','confirmed','active')",
      )
      .get().n,
    averageProcessingDays: days.length
      ? Math.round(
          (days.reduce((sum, value) => sum + Math.max(0, value), 0) /
            days.length) *
            10,
        ) / 10
      : null,
  }
}
export async function exportReport(user, filters, format = 'csv') {
  const { columns, rows } = applicationReport(filters)
  recordAuditLog({
    actorUserId: user.id,
    action: 'report.exported',
    entityType: 'report',
    newValue: { count: rows.length, format, filters },
  })
  if (format === 'csv') return csvDocument(columns, rows)
  const workbook = new ExcelJS.Workbook(),
    sheet = workbook.addWorksheet('Application status')
  sheet.addRow(columns)
  for (const row of rows) sheet.addRow(row.map((value) => String(value ?? '')))
  sheet.getRow(1).font = { bold: true }
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  }
  sheet.columns.forEach((column, index) => {
    column.width = [38, 26, 34, 20, 26, 24, 26, 24, 24, 38, 26][index]
  })
  return workbook.xlsx.writeBuffer()
}
