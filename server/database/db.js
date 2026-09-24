import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { config } from '../config.js'

let database = null

export function createDatabase(databaseFile = config.dbFile) {
  if (databaseFile !== ':memory:') {
    fs.mkdirSync(path.dirname(databaseFile), { recursive: true })
  }

  const db = new DatabaseSync(databaseFile)
  db.exec('PRAGMA foreign_keys = ON')
  db.exec('PRAGMA journal_mode = WAL')
  return db
}

export function getDatabase() {
  if (!database) {
    database = createDatabase()
  }
  return database
}

export function initializeDatabase(db = getDatabase()) {
  const schema = fs.readFileSync(config.schemaFile, 'utf8')
  db.exec(schema)
  for (const [table, definitions] of Object.entries({
    users: { token_version: 'INTEGER NOT NULL DEFAULT 0' },
    notifications: { event_key: 'TEXT', encrypted_body: 'TEXT', attempts: 'INTEGER NOT NULL DEFAULT 0', lease_until: 'INTEGER', next_attempt_at: 'INTEGER' },
    greyhound_allocations: { application_id: 'TEXT REFERENCES foster_applications(id)' },
    foster_applications: { portal_form_json: 'TEXT' },
  })) {
    const existing = db.prepare(`PRAGMA table_info(${table})`).all()
    for (const [name, definition] of Object.entries(definitions)) {
      if (!existing.some(column => column.name === name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)
    }
  }
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_event ON notifications(event_key)')
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_allocation_application ON greyhound_allocations(application_id) WHERE allocation_status IN ('proposed','confirmed','active')")
  const columns = db.prepare("PRAGMA table_info(foster_applications)").all()
  if (!columns.some((column) => column.name === 'revision')) {
    db.exec('ALTER TABLE foster_applications ADD COLUMN revision INTEGER NOT NULL DEFAULT 0')
  }
  if (!columns.some((column) => column.name === 'application_type')) {
    db.exec("ALTER TABLE foster_applications ADD COLUMN application_type TEXT NOT NULL DEFAULT 'foster' CHECK (application_type IN ('adoption', 'foster'))")
  }
}

export function withTransaction(work, db = getDatabase()) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = work(db)
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function closeDatabase() {
  if (database) {
    database.close()
    database = null
  }
}
