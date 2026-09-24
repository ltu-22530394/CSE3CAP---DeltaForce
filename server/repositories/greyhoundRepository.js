import { randomUUID } from 'node:crypto'
import { parse } from 'csv-parse/sync'
import { getDatabase, withTransaction } from '../database/db.js'
import { ApiError } from '../utils/apiError.js'
import { recordAuditLog } from './auditRepository.js'

function validate(input) {
  if (!input || typeof input !== 'object')
    throw new ApiError(400, 'VALIDATION', 'Greyhound details are required.')
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (name.length < 2 || name.length > 80)
    throw new ApiError(400, 'VALIDATION', 'Name must contain 2–80 characters.')
  if (!Number.isInteger(input.age) || input.age < 1 || input.age > 20)
    throw new ApiError(400, 'VALIDATION', 'Age must be an integer from 1–20.')
  if (!['Male', 'Female'].includes(input.sex))
    throw new ApiError(400, 'VALIDATION', 'Sex must be Male or Female.')
  if (!['available', 'medical_hold'].includes(input.status))
    throw new ApiError(
      400,
      'VALIDATION',
      'Status must be available or medical_hold.',
    )
  return {
    name,
    age: input.age,
    sex: input.sex.toLowerCase(),
    status: input.status === 'medical_hold' ? 'unavailable' : 'available',
  }
}
function map(row) {
  return {
    id: row.id,
    identifier: row.greyhound_identifier,
    name: row.name,
    age: row.age_years,
    sex:
      row.sex === 'female' ? 'Female' : row.sex === 'male' ? 'Male' : 'Unknown',
    status: ['allocated', 'pending_allocation', 'adopted'].includes(
      row.availability_status,
    )
      ? 'assigned'
      : ['available', 'returned'].includes(row.availability_status)
        ? 'available'
        : 'medical_hold',
  }
}
export function listGreyhounds() {
  return getDatabase()
    .prepare('SELECT * FROM greyhounds ORDER BY name')
    .all()
    .map(map)
}
export function saveGreyhound(input, actorUserId, req) {
  const clean = validate(input),
    id = input.id || randomUUID()
  withTransaction((db) => {
    if (input.id) {
      const row = db.prepare('SELECT * FROM greyhounds WHERE id=?').get(id)
      if (!row)
        throw new ApiError(404, 'NOT_FOUND', 'Greyhound could not be found.')
      if (
        ['allocated', 'pending_allocation', 'adopted'].includes(
          row.availability_status,
        )
      )
        throw new ApiError(
          409,
          'ASSIGNED',
          'Assigned greyhounds cannot be edited here.',
        )
      db.prepare(
        "UPDATE greyhounds SET name=?,age_years=?,sex=?,availability_status=?,updated_at=datetime('now') WHERE id=?",
      ).run(clean.name, clean.age, clean.sex, clean.status, id)
    } else
      db.prepare(
        'INSERT INTO greyhounds (id,greyhound_identifier,name,age_years,sex,availability_status) VALUES (?,?,?,?,?,?)',
      ).run(id, `GAP-${id}`, clean.name, clean.age, clean.sex, clean.status)
    recordAuditLog({
      actorUserId,
      action: 'greyhound.saved',
      entityType: 'greyhound',
      entityId: id,
      req,
    })
  })
  return map(
    getDatabase().prepare('SELECT * FROM greyhounds WHERE id=?').get(id),
  )
}
export function importGreyhounds(input, actorUserId) {
  const id = randomUUID(),
    errors = [],
    db = getDatabase()
  let rows = [],
    inserted = 0,
    duplicates = 0
  try {
    if (typeof input?.csv !== 'string' || Buffer.byteLength(input.csv) > 500000)
      throw new Error('Choose a CSV file under 500 KB.')
    rows = parse(input.csv, {
      bom: true,
      skip_empty_lines: true,
      trim: true,
      max_record_size: 10000,
      columns(headers) {
        const required = ['identifier', 'name', 'age', 'sex', 'status']
        if (
          headers.length !== required.length ||
          !required.every((h) => headers.includes(h))
        )
          throw new Error('Expected columns: identifier,name,age,sex,status.')
        return headers
      },
    })
    if (!rows.length || rows.length > 1000)
      throw new Error('Import between 1 and 1,000 rows.')
  } catch (error) {
    errors.push({
      row: null,
      message:
        error.message.startsWith('Expected columns') ||
        error.message.startsWith('Choose') ||
        error.message.startsWith('Import')
          ? error.message
          : 'Invalid CSV format. Check quoting and column counts.',
    })
  }
  withTransaction(() => {
    if (!errors.length)
      rows.forEach((row, index) => {
        try {
          if (!/^[A-Za-z0-9_-]{1,80}$/.test(row.identifier || ''))
            throw new Error(
              'Identifier must contain 1–80 letters, numbers, hyphens or underscores.',
            )
          const clean = validate({
            ...row,
            age: /^\d+$/.test(row.age) ? Number(row.age) : NaN,
          })
          if (
            db
              .prepare(
                'SELECT 1 FROM greyhounds WHERE greyhound_identifier=? COLLATE NOCASE',
              )
              .get(row.identifier)
          ) {
            duplicates++
            errors.push({
              row: index + 2,
              message: `Duplicate identifier ${row.identifier}; existing record left unchanged.`,
            })
            return
          }
          db.prepare(
            'INSERT INTO greyhounds (id,greyhound_identifier,name,age_years,sex,availability_status) VALUES (?,?,?,?,?,?)',
          ).run(
            randomUUID(),
            row.identifier,
            clean.name,
            clean.age,
            clean.sex,
            clean.status,
          )
          inserted++
        } catch (error) {
          if (!(error instanceof ApiError) && error.code) throw error
          errors.push({ row: index + 2, message: error.message })
        }
      })
    db.prepare(
      'INSERT INTO greyhound_import_batches (id,imported_by_user_id,source_file_name,total_records,successful_records,failed_records,duplicate_records,import_status) VALUES (?,?,?,?,?,?,?,?)',
    ).run(
      id,
      actorUserId,
      String(input?.fileName || 'upload.csv').slice(0, 200),
      rows.length,
      inserted,
      Math.max(0, errors.length - duplicates),
      duplicates,
      inserted
        ? errors.length
          ? 'completed_with_errors'
          : 'completed'
        : 'failed',
    )
    for (const error of errors)
      db.prepare(
        'INSERT INTO greyhound_import_errors (import_batch_id,row_number,error_message) VALUES (?,?,?)',
      ).run(id, error.row, error.message)
  })
  return { id, total: rows.length, inserted, duplicates, errors }
}
