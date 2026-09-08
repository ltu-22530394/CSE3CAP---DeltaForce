import { Router } from 'express'
import { requireAuth, requireStaff } from '../middleware/authMiddleware.js'
import { createAllocation, decideApplication, getStaffApplication, listAllocations, listAvailableGreyhounds, listStaffApplications } from '../repositories/staffRepository.js'
import { asyncRoute } from '../utils/apiError.js'
import { validateAllocation, validateDecision } from '../utils/staffValidation.js'

export const staffRouter = Router()
staffRouter.use(requireAuth, requireStaff)

staffRouter.get('/applications', (req, res) => res.json({ applications: listStaffApplications(req.query) }))
staffRouter.get('/applications/:id', (req, res) => res.json({ application: getStaffApplication(req.params.id) }))
staffRouter.patch('/applications/:id/decision', asyncRoute(async (req, res) => res.json({ application: decideApplication(req.params.id, validateDecision(req.body), req.user.id, req) })))
staffRouter.get('/greyhounds', (_req, res) => res.json({ greyhounds: listAvailableGreyhounds() }))
staffRouter.get('/allocations', (req, res) => res.json({ allocations: listAllocations(req.query.applicationId) }))
staffRouter.post('/allocations', asyncRoute(async (req, res) => res.status(201).json({ allocation: createAllocation(validateAllocation(req.body), req.user.id, req) })))
