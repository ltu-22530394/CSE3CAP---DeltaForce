import { Router } from 'express'

import { requireAuth, requireStaff } from '../middleware/authMiddleware.js'
import {
  approveStaffApplication,
  getStaffApplication,
  listStaffApplications,
  rejectStaffApplication,
} from '../repositories/staffApplicationRepository.js'
import { asyncRoute } from '../utils/apiError.js'

export const staffApplicationRouter = Router()

staffApplicationRouter.use(requireAuth, requireStaff)

staffApplicationRouter.get('/', (req, res) => {
  res.json(listStaffApplications(req.query))
})

staffApplicationRouter.get('/:id', (req, res) => {
  res.json({ application: getStaffApplication(req.params.id) })
})

staffApplicationRouter.post(
  '/:id/approve',
  asyncRoute(async (req, res) => {
    res.json({
      application: approveStaffApplication(
        req.params.id,
        req.user.id,
        req.body,
        req,
      ),
    })
  }),
)

staffApplicationRouter.post(
  '/:id/reject',
  asyncRoute(async (req, res) => {
    res.json({
      application: rejectStaffApplication(
        req.params.id,
        req.user.id,
        req.body,
        req,
      ),
    })
  }),
)
