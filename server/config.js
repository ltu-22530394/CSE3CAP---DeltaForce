import path from 'node:path'
import { fileURLToPath } from 'node:url'

import dotenv from 'dotenv'

dotenv.config({ quiet: true })

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function resolveProjectPath(value, fallback) {
  const selectedPath = value || fallback
  return path.isAbsolute(selectedPath)
    ? selectedPath
    : path.resolve(projectRoot, selectedPath)
}

const jwtSecret = process.env.JWT_SECRET || 'development-only-change-before-production'

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production.')
}

export const config = {
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:5173',
  dbFile: resolveProjectPath(process.env.GAPS_DB_FILE, 'server/data/gaps.sqlite'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  jwtSecret,
  passwordSaltRounds: Number(process.env.PASSWORD_SALT_ROUNDS || 12),
  port: Number(process.env.API_PORT || process.env.PORT || 4000),
  schemaFile: resolveProjectPath(
    process.env.GAPS_SCHEMA_FILE,
    'server/database/schema.sql',
  ),
}
