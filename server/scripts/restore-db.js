import fs from 'node:fs'
import path from 'node:path'
import { backup, DatabaseSync } from 'node:sqlite'

const args = process.argv.slice(2)
const value = (key) => {
  const selected = args[args.indexOf(key) + 1]
  if (!selected || selected.startsWith('--'))
    throw new Error('Provide a file path after ' + key)
  return selected
}
if (!args.includes('--source') || !args.includes('--target'))
  throw new Error(
    'Use --source <backup.sqlite> --target <new-recovered.sqlite>. The target must not exist.',
  )
const source = path.resolve(value('--source')),
  target = path.resolve(value('--target'))
if (fs.existsSync(target) || source === target)
  throw new Error(
    'Recovery never overwrites an existing database. Choose a new target path.',
  )
const db = new DatabaseSync(source, { readOnly: true })
try {
  if (
    db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' ||
    db.prepare('PRAGMA foreign_key_check').all().length
  )
    throw new Error('The source backup failed integrity checks.')
  if (
    !db
      .prepare(
        "SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'foster_applications'",
      )
      .get()
  )
    throw new Error('This file is not a foster portal database.')
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 })
  await backup(db, target)
  fs.chmodSync(target, 0o600)
  console.log(
    'Recovered database created. Stop the API, preserve its existing database, then configure GAPS_DB_FILE to the recovered file after reviewing it.',
  )
} finally {
  db.close()
}
