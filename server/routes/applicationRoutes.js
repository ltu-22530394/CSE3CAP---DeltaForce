import { Router } from 'express'
import { requireAuth, requireApplicant } from '../middleware/authMiddleware.js'
import { createApplication, deleteApplication, getApplication, listApplications, submitApplication, updateApplication } from '../repositories/applicationRepository.js'
import { asyncRoute } from '../utils/apiError.js'
import { validateApplicationInput, validateForSubmission } from '../utils/applicationValidation.js'

export const applicationRouter = Router()
applicationRouter.use(requireAuth, requireApplicant)

applicationRouter.get('/', (req, res) => res.json({ applications: listApplications(req.user.applicantId) }))
applicationRouter.post('/', asyncRoute(async (req, res) => res.status(201).json({ application: createApplication(req.user.applicantId, validateApplicationInput(req.body)) })))
applicationRouter.get('/:id', (req, res) => res.json({ application: getApplication(req.params.id, req.user.applicantId) }))
applicationRouter.put('/:id', asyncRoute(async (req, res) => res.json({ application: updateApplication(req.params.id, req.user.applicantId, validateApplicationInput(req.body)) })))
applicationRouter.delete('/:id', (req, res) => { deleteApplication(req.params.id, req.user.applicantId); res.status(204).send() })
applicationRouter.post('/:id/submit', (req, res) => { const current = getApplication(req.params.id, req.user.applicantId); validateForSubmission(current); res.json({ application: submitApplication(req.params.id, req.user.applicantId) }) })
