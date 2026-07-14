import { Router } from 'express';
import { ClaimController } from '../controllers/claim.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';

const router = Router();
const controller = new ClaimController();

// Apply JWT authentication globally to all claims routes
router.use(authenticateJWT);

/**
 * @swagger
 * /api/claims/draft:
 *   post:
 *     summary: Save or update a draft claim
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Draft saved
 */
router.post('/draft', requireRoles(['Employee']), controller.saveDraft);

/**
 * @swagger
 * /api/claims:
 *   post:
 *     summary: Submit a new medical claim
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Claim created successfully
 */
router.post('/', requireRoles(['Employee']), controller.submitClaim);

/**
 * @swagger
 * /api/claims/{id}/submit:
 *   post:
 *     summary: Finalize and submit a draft claim
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Claim submitted
 */
router.post('/:id/submit', requireRoles(['Employee']), controller.submitFinalClaim);

/**
 * @swagger
 * /api/claims:
 *   get:
 *     summary: Get claims review queue
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of claims in queue
 */
router.get('/', requireRoles(['Employee', 'Medical Officer', 'Accounts Officer', 'DDO', 'Treasury', 'Administrator']), controller.getQueue);


/**
 * @swagger
 * /api/claims/{id}:
 *   get:
 *     summary: Get details of a specific claim
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Claim details
 */
router.get('/:id', controller.getClaim);

/**
 * @swagger
 * /api/claims/{id}/workflow:
 *   post:
 *     summary: Process a workflow action (approve, return, reject)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Action processed
 */
router.post('/:id/workflow', requireRoles(['Medical Officer', 'Accounts Officer', 'DDO', 'Treasury', 'Administrator']), controller.processWorkflowAction);


/**
 * @swagger
 * /api/claims/{id}/documents:
 *   post:
 *     summary: Request a pre-signed URL to upload documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pre-signed upload configurations
 */
router.post('/:id/documents', requireRoles(['Employee']), controller.requestUploadSignature);

/**
 * @swagger
 * /api/claims/{id}/sanction-order:
 *   get:
 *     summary: Download Sanction Order PDF
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF file binary download
 */
router.get('/:id/sanction-order', requireRoles(['Employee', 'Medical Officer', 'Accounts Officer', 'DDO', 'Treasury', 'Administrator']), controller.downloadSanctionOrder);

export default router;
