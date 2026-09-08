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
