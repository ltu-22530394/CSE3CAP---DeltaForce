import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { config } from '../config.js'
import { getDatabase, withTransaction } from '../database/db.js'

export function seedDemoStaff() {
  if (!config.demoStaffEnabled || process.env.NODE_ENV === 'test') return
  const db = getDatabase()
  if (
    db.prepare("SELECT id FROM users WHERE email = 'jamie@gap.example'").get()
  )
    return
  withTransaction(() => {
    const id = randomUUID()
    db.prepare(
      "INSERT INTO users (id, email, password_hash, role_id, email_verified_at) VALUES (?, 'jamie@gap.example', ?, 'admin', datetime('now'))",
    ).run(
      id,
      bcrypt.hashSync(config.demoStaffPassword, config.passwordSaltRounds),
    )
    db.prepare(
      "INSERT INTO staff_profiles (id, user_id, full_name) VALUES (?, ?, 'Jamie Parker')",
    ).run(randomUUID(), id)
  })
}
