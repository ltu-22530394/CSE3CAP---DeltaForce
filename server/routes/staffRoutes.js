import { listGreyhounds, saveGreyhound, importGreyhounds } from '../repositories/greyhoundRepository.js'
import { listStaffApplications, getStaffApplication } from '../repositories/staffRepository.js'
import { Router } from 'express'
import { requireAuth, requireStaff } from '../middleware/authMiddleware.js'
import { createAllocation, decideApplication, listAllocations, listAvailableGreyhounds } from '../repositories/staffRepository.js'
import { asyncRoute } from '../utils/apiError.js'
import { validateAllocation, validateDecision } from '../utils/staffValidation.js'

export const staffRouter = Router()
staffRouter.use(requireAuth, requireStaff)

staffRouter.patch('/applications/:id/decision', asyncRoute(async (req, res) => res.json({ application: decideApplication(req.params.id, validateDecision(req.body), req.user.id, req) })))
staffRouter.get('/greyhounds', (_req, res) => res.json({ greyhounds: listAvailableGreyhounds() }))
staffRouter.get('/allocations', (req, res) => res.json({ allocations: listAllocations(req.query.applicationId) }))
staffRouter.post('/allocations', asyncRoute(async (req, res) => res.status(201).json({ allocation: createAllocation(validateAllocation(req.body), req.user.id, req) })))

// Canonical UI contract includes revisions, request history and assignment details.
staffRouter.get('/portal/applications', (req, res) => res.json({ applications: listStaffApplications(req.query) }))
staffRouter.get('/portal/applications/:id', (req, res) => res.json({ application: getStaffApplication(req.params.id) }))
staffRouter.get('/greyhound-records', (_req, res) => res.json({ greyhounds: listGreyhounds() }))
staffRouter.post('/greyhound-records', (req, res) => res.status(201).json({ greyhound: saveGreyhound(req.body, req.user.id, req) }))
staffRouter.post('/greyhounds/import', (req, res) => res.json(importGreyhounds(req.body, req.user.id)))
