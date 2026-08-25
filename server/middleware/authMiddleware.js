import { findPublicUserById } from '../repositories/userRepository.js'
import { ApiError } from '../utils/apiError.js'
import { verifyAccessToken } from '../utils/jwt.js'

function bearerToken(req) {
  const authorization = req.get('authorization') || ''
  const [scheme, token] = authorization.split(' ')
  return scheme?.toLowerCase() === 'bearer' ? token : null
}

export function requireAuth(req, _res, next) {
  const token = bearerToken(req)

  if (!token) {
    next(new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.'))
    return
  }

  try {
    const payload = verifyAccessToken(token)
    const user = findPublicUserById(payload.sub)

    if (!user) {
      next(new ApiError(401, 'INVALID_TOKEN', 'Authentication token is invalid.'))
      return
    }

    if (user.accountStatus !== 'active') {
      next(new ApiError(403, 'ACCOUNT_NOT_ACTIVE', 'This account is not active.'))
      return
    }

    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      next(new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.'))
      return
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new ApiError(403, 'FORBIDDEN', 'You do not have permission for this action.'))
      return
    }

    next()
  }
}

export const requireApplicant = requireRole('applicant', 'foster_carer')
export const requireStaff = requireRole('staff', 'admin')
