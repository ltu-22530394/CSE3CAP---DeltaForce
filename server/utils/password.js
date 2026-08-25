import bcrypt from 'bcryptjs'

import { config } from '../config.js'

export function hashPassword(password) {
  return bcrypt.hash(password, config.passwordSaltRounds)
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash)
}
