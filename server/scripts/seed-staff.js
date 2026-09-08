import { randomUUID } from 'node:crypto'
import { initializeDatabase, closeDatabase, getDatabase, withTransaction } from '../database/db.js'
import { hashPassword } from '../utils/password.js'

const email = String(process.env.STAFF_EMAIL || 'jamie@gap.example').trim().toLowerCase()
const fullName = String(process.env.STAFF_NAME || 'Jamie Morgan').trim()
const password = String(process.env.STAFF_PASSWORD || '')

if (password.length < 8) {
  throw new Error('Set STAFF_PASSWORD to at least 8 characters before running seed:staff.')
}

initializeDatabase()
const db = getDatabase()
if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) {
  throw new Error(`A user already exists for ${email}.`)
}

const userId = randomUUID()
const passwordHash = await hashPassword(password)
withTransaction((transaction) => {
  transaction.prepare("INSERT INTO users (id,email,password_hash,role_id,account_status) VALUES (?,?,?,'staff','active')").run(userId, email, passwordHash)
  transaction.prepare('INSERT INTO staff_profiles (user_id,full_name,job_title) VALUES (?,?,?)').run(userId, fullName, 'Adoption Coordinator')
})
closeDatabase()
console.log(`Created staff account for ${email}.`)
