import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';

const router = Router();
const controller = new UserController();

// All endpoints require JWT + Administrator role
router.use(authenticateJWT);
router.use(requireRoles(['Administrator']));

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all employee users (Admin only)
 *     parameters:
 *       - in: query
 *         name: search
 *       - in: query
 *         name: role
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, disabled, pending]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', controller.listUsers);

/**
 * @swagger
 * /api/users/audit-logs:
 *   get:
 *     summary: Get user management audit logs (Admin only)
 *     security:
 *       - bearerAuth: []
 */
router.get('/audit-logs', controller.getAuditLogs);

/**
 * @swagger
 * /api/users/bulk-import:
 *   post:
 *     summary: Bulk import employees from spreadsheet rows (Admin only)
 *     security:
 *       - bearerAuth: []
 */
router.post('/bulk-import', controller.bulkImport);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create new employee account (Admin only)
 *     security:
 *       - bearerAuth: []
 */
router.post('/', controller.createEmployee);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get single employee profile (Admin only)
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', controller.getUser);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update employee details (Admin only)
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', controller.updateEmployee);

/**
 * @swagger
 * /api/users/{id}/reset-password:
 *   post:
 *     summary: Reset employee password (Admin only)
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/reset-password', controller.resetPassword);

/**
 * @swagger
 * /api/users/{id}/toggle-status:
 *   post:
 *     summary: Enable/disable employee account (Admin only)
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/toggle-status', controller.toggleStatus);

/**
 * @swagger
 * /api/users/{id}/assign-role:
 *   post:
 *     summary: Assign system role to employee (Admin only)
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/assign-role', controller.assignRole);

// Onboarding & Credential Distribution Center routes
router.post('/send-onboarding-emails', controller.sendOnboardingEmails);
router.get('/import-jobs', controller.getImportJobs);
router.get('/import-jobs/:id', controller.getImportJobReport);
router.post('/import-jobs/:id/retry-emails', controller.retryFailedEmails);
router.post('/import-jobs/:id/new-passwords', controller.regenerateJobCredentials);
router.post('/:id/unlock', controller.unlockUser);

export default router;
