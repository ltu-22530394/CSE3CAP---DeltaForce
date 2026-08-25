import { Router } from 'express'

import {
  requireApplicant,
  requireAuth,
  requireStaff,
} from '../middleware/authMiddleware.js'

export const protectedRouter = Router()

protectedRouter.get('/applicant', requireAuth, requireApplicant, (req, res) => {
  res.json({
    message: 'Applicant protected route reached.',
    user: req.user,
  })
})

protectedRouter.get('/staff', requireAuth, requireStaff, (req, res) => {
  res.json({
    message: 'Staff protected route reached.',
    user: req.user,
  })
})
