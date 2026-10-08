import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { config } from '../config.js'
import { backfillLegacyApplications } from './legacyApplications.js'

let database = null
const transactionDepth = new WeakMap()

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
  db.exec(
    fs.readFileSync(new URL('./integration.sql', import.meta.url), 'utf8'),
  )
  db.exec(fs.readFileSync(new URL('./completion.sql', import.meta.url), 'utf8'))
  const notificationSql = db
    .prepare("SELECT sql FROM sqlite_schema WHERE name = 'notifications'")
    .get().sql
  if (!notificationSql.includes("'weekly_report'")) {
    // Rebuild the old CHECK constraint without renaming the referenced table.
    const replacement = notificationSql
      .replace(
        /^CREATE TABLE(?: IF NOT EXISTS)? notifications/i,
        'CREATE TABLE notifications_new',
      )
      .replace(
        "'password_reset'",
        "'password_reset', 'withdrawal', 'weekly_report'",
      )
    db.exec('PRAGMA foreign_keys = OFF')
    try {
      withTransaction(() => {
        db.exec(replacement)
        db.exec('INSERT INTO notifications_new SELECT * FROM notifications')
        db.exec('DROP TABLE notifications')
        db.exec('ALTER TABLE notifications_new RENAME TO notifications')
      }, db)
    } finally {
      db.exec('PRAGMA foreign_keys = ON')
    }
    db.exec(schema)
    if (db.prepare('PRAGMA foreign_key_check').all().length)
      throw new Error('Database migration integrity check failed.')
  }
  backfillLegacyApplications(db)
}

export function withTransaction(work, db = getDatabase()) {
  const depth = transactionDepth.get(db) || 0
  const savepoint = `portal_transaction_${depth}`
  db.exec(depth ? `SAVEPOINT ${savepoint}` : 'BEGIN IMMEDIATE')
  transactionDepth.set(db, depth + 1)
  try {
    const result = work(db)
    db.exec(depth ? `RELEASE SAVEPOINT ${savepoint}` : 'COMMIT')
    return result
  } catch (error) {
    db.exec(depth ? `ROLLBACK TO SAVEPOINT ${savepoint}` : 'ROLLBACK')
    throw error
  } finally {
    transactionDepth.set(db, depth)
  }
}

export function closeDatabase() {
  if (database) {
    database.close()
    database = null
  }
}
