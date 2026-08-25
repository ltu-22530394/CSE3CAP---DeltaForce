import { getDatabase } from '../database/db.js'

function toJson(value) {
  return value === undefined ? null : JSON.stringify(value)
}

export function recordAuditLog({
  actorUserId = null,
  action,
  entityType,
  entityId = null,
  previousValue = undefined,
  newValue = undefined,
  req = null,
}) {
  getDatabase()
    .prepare(
      `
        INSERT INTO audit_logs (
          actor_user_id,
          action,
          entity_type,
          entity_id,
          previous_value_json,
          new_value_json,
          ip_address,
          user_agent
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      actorUserId,
      action,
      entityType,
      entityId,
      toJson(previousValue),
      toJson(newValue),
      req?.ip || null,
      req?.get?.('user-agent') || null,
    )
}
