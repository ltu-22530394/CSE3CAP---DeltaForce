import { getDatabase } from '../database/db.js'
import { ApiError } from '../utils/apiError.js'
import { recordAuditLog } from './auditRepository.js'

export const defaultSettings = {
  contactEmail: '',
  contactPhone: '',
  privacyUrl: '',
  termsUrl: '',
  fosteringInformation:
    'Fostering offers a temporary home while a greyhound prepares for adoption.',
  basicRequirements:
    'GAP staff assess your home, household, availability and ability to provide suitable care. Apply to discuss a suitable placement.',
  privacyText:
    'Application details are used by authorised GAP staff to assess foster suitability, arrange placements and communicate with you. Request correction of contact information through your profile. Final privacy, retention and terms wording must be approved by GAP before launch.',
  termsText:
    'This is a capstone proof of concept. GAP must provide approved terms of use before public deployment.',
  weeklyEnabled: false,
  weeklyRecipients: [],
}
export function portalSettings() {
  const row = getDatabase()
    .prepare("SELECT value_json FROM portal_settings WHERE id = 'main'")
    .get()
  return { ...defaultSettings, ...(row ? JSON.parse(row.value_json) : {}) }
}
export function saveSettings(user, input) {
  const previous = portalSettings()
  const value = { ...previous }
  for (const key of Object.keys(defaultSettings).filter(
    (key) => typeof defaultSettings[key] === 'string',
  )) {
    value[key] = String(input[key] ?? previous[key]).trim()
    if (value[key].length > 8000)
      throw new ApiError(
        400,
        'VALIDATION',
        'Keep settings text within 8,000 characters.',
      )
  }
  for (const key of ['privacyUrl', 'termsUrl']) {
    if (value[key]) {
      try {
        if (new URL(value[key]).protocol !== 'https:') throw new Error()
      } catch {
        throw new ApiError(400, 'VALIDATION', 'Policy links must use HTTPS.')
      }
    }
  }
  if (
    value.contactEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.contactEmail)
  )
    throw new ApiError(400, 'VALIDATION', 'Enter a valid contact email.')
  value.weeklyEnabled = input.weeklyEnabled === true
  if (
    !Array.isArray(input.weeklyRecipients) ||
    input.weeklyRecipients.length > 50
  )
    throw new ApiError(
      400,
      'VALIDATION',
      'Choose authorised report recipients.',
    )
  value.weeklyRecipients = [...new Set(input.weeklyRecipients)]
  for (const id of value.weeklyRecipients) {
    if (
      !getDatabase()
        .prepare(
          "SELECT id FROM users WHERE id = ? AND role_id IN ('staff', 'admin') AND account_status = 'active'",
        )
        .get(id)
    )
      throw new ApiError(
        400,
        'VALIDATION',
        'Weekly reports can only go to active staff accounts.',
      )
  }
  if (value.weeklyEnabled && !value.weeklyRecipients.length)
    throw new ApiError(
      400,
      'VALIDATION',
      'Select at least one weekly report recipient.',
    )
  getDatabase()
    .prepare(
      "INSERT INTO portal_settings (id, value_json) VALUES ('main', ?) ON CONFLICT(id) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')",
    )
    .run(JSON.stringify(value))
  recordAuditLog({
    actorUserId: user.id,
    action: 'settings.updated',
    entityType: 'settings',
    entityId: 'main',
    previousValue: previous,
    newValue: value,
  })
  return value
}
export function publicSettings() {
  return Object.fromEntries(
    Object.entries(portalSettings()).filter(
      ([key]) => !['weeklyEnabled', 'weeklyRecipients'].includes(key),
    ),
  )
}
