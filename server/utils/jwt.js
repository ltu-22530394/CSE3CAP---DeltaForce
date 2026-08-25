import jwt from 'jsonwebtoken'

import { config } from '../config.js'
import { ApiError } from './apiError.js'

const ISSUER = 'gaps-auth-api'

export function createAccessToken(user) {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
      issuer: ISSUER,
      subject: user.id,
    },
  )
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret, { issuer: ISSUER })
  } catch {
    throw new ApiError(401, 'INVALID_TOKEN', 'Authentication token is invalid or expired.')
  }
}
