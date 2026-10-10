import path from 'node:path'
import { fileURLToPath } from 'node:url'

import dotenv from 'dotenv'

dotenv.config({ quiet: true })

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

function resolveProjectPath(value, fallback) {
  const selectedPath = value || fallback
  if (selectedPath === ':memory:') return selectedPath
  return path.isAbsolute(selectedPath)
    ? selectedPath
    : path.resolve(projectRoot, selectedPath)
}

const jwtSecret =
  process.env.JWT_SECRET || 'development-only-change-before-production'

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production.')
}

export const config = {
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:5173',
  dbFile: resolveProjectPath(
    process.env.GAPS_DB_FILE,
    'server/data/gaps.sqlite',
  ),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  jwtSecret,
  passwordSaltRounds: Number(process.env.PASSWORD_SALT_ROUNDS || 12),
  port: Number(process.env.API_PORT || process.env.PORT || 4000),
  schemaFile: resolveProjectPath(
    process.env.GAPS_SCHEMA_FILE,
    'server/database/schema.sql',
  ),
  production: process.env.NODE_ENV === 'production',
  timezone: process.env.APP_TIMEZONE || 'Australia/Sydney',
  backupEnabled: process.env.BACKUP_ENABLED !== 'false',
  backupDir: resolveProjectPath(process.env.BACKUP_DIR, 'server/backups'),
  trustProxy: Number(process.env.TRUST_PROXY_HOPS || 0),
  idleTimeoutMs: 30 * 60 * 1000,
  demoStaffEnabled:
    process.env.DEMO_STAFF_ENABLED !== 'false' &&
    process.env.NODE_ENV !== 'production',
  demoStaffPassword: process.env.DEMO_STAFF_PASSWORD || 'Greyhound2026!',
  emailMode: 'disabled',
  googleClientId: (
    process.env.GOOGLE_CLIENT_ID ||
    '840227453935-au02u35fe7vj0gtr5cn723vljfn56b6q.apps.googleusercontent.com'
  ).trim(),
  bootstrapAdminEmail: (process.env.BOOTSTRAP_ADMIN_EMAIL || '')
    .trim()
    .toLowerCase(),
  bootstrapAdminName: (process.env.BOOTSTRAP_ADMIN_NAME || '').trim(),
  bootstrapAdminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD || '',
  salesforceLoginUrl: process.env.SALESFORCE_LOGIN_URL,
  salesforceClientId: process.env.SALESFORCE_CLIENT_ID,
  salesforceClientSecret: process.env.SALESFORCE_CLIENT_SECRET,
  salesforceApiVersion: process.env.SALESFORCE_API_VERSION || 'v65.0',
  salesforceObject: process.env.SALESFORCE_GREYHOUND_OBJECT,
  salesforceFieldMap: process.env.SALESFORCE_FIELD_MAP || '',
}

if (config.production && !config.appOrigin.startsWith('https://'))
  throw new Error('Production requires an HTTPS APP_ORIGIN.')
if (
  config.production &&
  (config.jwtSecret.length < 32 ||
    config.jwtSecret.includes('replace-with') ||
    config.jwtSecret.includes('development-only'))
)
  throw new Error(
    'Use a random JWT_SECRET of at least 32 characters in production.',
  )
new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone })
if (
  !Number.isInteger(config.trustProxy) ||
  config.trustProxy < 0 ||
  config.trustProxy > 10
)
  throw new Error('TRUST_PROXY_HOPS must be an integer from 0 to 10.')
