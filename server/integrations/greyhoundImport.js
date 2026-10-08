import { randomUUID } from 'node:crypto'
import { parse } from 'csv-parse/sync'
import { getDatabase, withTransaction } from '../database/db.js'
import { ApiError } from '../utils/apiError.js'
import { recordAuditLog } from '../repositories/auditRepository.js'
import {
  cleanGreyhound,
  greyhoundColumns,
} from '../utils/greyhoundValidation.js'

const normal = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
const aliases = {
  greyhoundid: 'id',
  greyhoundidentifier: 'id',
  identifier: 'id',
  greyhoundname: 'name',
  ageyears: 'age',
  salesforcerecordid: 'salesforceId',
  salesforceid: 'salesforceId',
  registrationnumber: 'registrationNumber',
  currentlocation: 'location',
  availability: 'status',
  availabilitystatus: 'status',
  currentstatus: 'status',
}
const supported = [
  'id',
  ...Object.keys(greyhoundColumns),
  'feedingInformation',
  'photoUrl',
]
export function normalizeHeaders(columns) {
  const headers = columns.map(
    (column) =>
      aliases[normal(column)] ||
      supported.find((field) => normal(field) === normal(column)) ||
      String(column),
  )
  if (new Set(headers).size !== headers.length)
    throw new ApiError(400, 'INVALID_FILE', 'Duplicate column names.')
  const missing = ['id', 'name', 'sex'].filter(
    (column) => !headers.includes(column),
  )
  if (!headers.includes('age') && !headers.includes('dateOfBirth'))
    missing.push('age or dateOfBirth')
  if (missing.length)
    throw new ApiError(
      400,
      'MISSING_COLUMNS',
      'Missing mandatory columns: ' + missing.join(', '),
    )
  return headers
}
export function parseGreyhoundCsv(text, fileName) {
  if (
    typeof fileName !== 'string' ||
    !fileName.toLowerCase().endsWith('.csv') ||
    typeof text !== 'string' ||
    Buffer.byteLength(text) > 1024 * 1024
  )
    throw new ApiError(
      400,
      'INVALID_FILE',
      'Upload a CSV file of at most 1 MB.',
    )
  try {
    let headers
    const rows = parse(text, {
      bom: true,
      trim: true,
      skip_empty_lines: true,
      columns: (columns) => (headers = normalizeHeaders(columns)),
    })
    if (!headers || !rows.length || rows.length > 5000)
      throw new ApiError(
        400,
        'INVALID_FILE',
        'Include between 1 and 5,000 records.',
      )
    return rows
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(
      400,
      'INVALID_CSV',
      'The CSV could not be read. Check column names, quoting, and row lengths.',
    )
  }
}
export function importGreyhoundRows(
  user,
  rows,
  { fileName, confirm = false, overwrite = false },
) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 5000)
    throw new ApiError(
      400,
      'INVALID_FILE',
      'Include between 1 and 5,000 records.',
    )
  const db = getDatabase(),
    seen = new Set(),
    valid = [],
    errors = []
  let duplicates = 0
  rows.forEach((row, index) => {
    try {
      const identifier = String(row.id || row.identifier || '').trim()
      const matches = db
        .prepare(
          'SELECT id FROM greyhounds WHERE greyhound_identifier = ? OR salesforce_record_id = ? OR registration_number = ?',
        )
        .all(
          identifier,
          String(row.salesforceId || '') || null,
          String(row.registrationNumber || '') || null,
        )
      if (matches.length > 1)
        throw new ApiError(
          400,
          'VALIDATION',
          'Identifiers match different existing records. Correct them before importing.',
        )
      const existing = matches[0]
      const previous = existing
        ? db
            .prepare(
              'SELECT g.*, e.feeding_information, e.photo_url FROM greyhounds g LEFT JOIN greyhound_extra e ON e.greyhound_id = g.id WHERE g.id = ?',
            )
            .get(existing.id)
        : null
      const retained = previous
        ? Object.fromEntries(
            Object.entries(greyhoundColumns).map(([key, column]) => [
              key,
              previous[column],
            ]),
          )
        : {}
      if (previous)
        Object.assign(retained, {
          feedingInformation: previous.feeding_information,
          photoUrl: previous.photo_url,
        })
      const assigned =
        existing &&
        db
          .prepare(
            "SELECT 1 FROM greyhound_allocations WHERE greyhound_id = ? AND allocation_status IN ('proposed','confirmed','active')",
          )
          .get(existing.id)
      const record = cleanGreyhound(
        { ...retained, ...row, identifier },
        { assigned: Boolean(assigned) },
      )
      const keys = [
        record.identifier,
        existing && 'existing:' + existing.id,
        record.salesforceId && 'sf:' + record.salesforceId,
        record.registrationNumber && 'reg:' + record.registrationNumber,
      ].filter(Boolean)
      if (keys.some((key) => seen.has(key))) {
        duplicates++
        throw new ApiError(
          400,
          'DUPLICATE',
          'Duplicate identifier within this file.',
        )
      }
      keys.forEach((key) => seen.add(key))
      if (existing) duplicates++
      valid.push({ record, existing })
    } catch (error) {
      if (!(error instanceof ApiError)) throw error
      errors.push({ row: index + 2, message: error.message })
    }
  })
  const summary = {
    total: rows.length,
    successful: 0,
    failed: errors.length,
    duplicates,
    skipped: 0,
    errors,
    overwriteRequired: duplicates > 0,
    preview: !confirm,
    importedAt: new Date().toISOString(),
    importedBy: user.fullName,
  }
  if (!confirm) {
    summary.successful = valid.filter(
      (row) => !row.existing || overwrite,
    ).length
    summary.skipped = valid.filter((row) => row.existing && !overwrite).length
    return summary
  }
  withTransaction(() => {
    const columns = Object.values(greyhoundColumns)
    for (const { record, existing } of valid) {
      if (existing && !overwrite) {
        summary.skipped++
        continue
      }
      const id = existing?.id || randomUUID(),
        values = Object.keys(greyhoundColumns).map((key) => record[key])
      if (existing)
        db.prepare(
          `UPDATE greyhounds SET ${columns.map((column) => column + ' = ?').join(', ')}, updated_at = datetime('now') WHERE id = ?`,
        ).run(...values, id)
      else
        db.prepare(
          `INSERT INTO greyhounds (id, ${columns.join(', ')}) VALUES (?, ${columns.map(() => '?').join(', ')})`,
        ).run(id, ...values)
      db.prepare(
        'INSERT INTO greyhound_extra (greyhound_id, feeding_information, photo_url) VALUES (?, ?, ?) ON CONFLICT(greyhound_id) DO UPDATE SET feeding_information = excluded.feeding_information, photo_url = excluded.photo_url',
      ).run(id, record.feedingInformation, record.photoUrl)
      summary.successful++
    }
    const batchId = randomUUID()
    db.prepare(
      'INSERT INTO greyhound_import_batches (id, imported_by_user_id, source_file_name, total_records, successful_records, failed_records, duplicate_records, import_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      batchId,
      user.id,
      fileName,
      summary.total,
      summary.successful,
      summary.failed,
      duplicates,
      summary.failed
        ? summary.successful
          ? 'completed_with_errors'
          : 'failed'
        : 'completed',
    )
    for (const error of errors)
      db.prepare(
        'INSERT INTO greyhound_import_errors (id, import_batch_id, row_number, error_message) VALUES (?, ?, ?, ?)',
      ).run(randomUUID(), batchId, error.row, error.message)
    summary.batchId = batchId
    recordAuditLog({
      actorUserId: user.id,
      action: 'greyhound.imported',
      entityType: 'import',
      entityId: batchId,
      newValue: {
        successful: summary.successful,
        failed: summary.failed,
        duplicates,
      },
    })
  })
  return summary
}
export function csvCell(value) {
  let text = String(value ?? '')
  if (/^\s*[=+@-]/.test(text)) text = "'" + text
  return '"' + text.replaceAll('"', '""') + '"'
}
export function csvDocument(columns, records) {
  return (
    '\uFEFF' +
    [
      columns.map(csvCell).join(','),
      ...records.map((record) => record.map(csvCell).join(',')),
    ].join('\r\n')
  )
}
