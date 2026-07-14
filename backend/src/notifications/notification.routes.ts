import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { NotificationService } from './notification.service';

const router = Router();
const service = new NotificationService();

// Guard all notification routes with JWT checks
router.use(authenticateJWT);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Retrieve user in-app notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of notifications
 */
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    const list = await service.getUserNotifications(req.user.id);
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark a specific notification as read
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
 *         description: Notification updated
 */
router.patch('/:id/read', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    const updated = await service.markAsRead(req.user.id, req.params.id);
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/sla-scan:
 *   post:
 *     summary: Trigger manual scanner for SLA delays
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Delays check summary
 */
router.post('/sla-scan', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const triggered = await service.scanAndTriggerDelayAlerts();
    return res.status(200).json({ success: true, message: `Scan complete. Triggered ${triggered} delay alerts.` });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/trigger-test:
 *   post:
 *     summary: Simulate triggering notification templates
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test notification dispatched
 */
router.post('/trigger-test', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { eventType, userId, claimNumber, amount, comments, role } = req.body;
    await service.triggerWorkflowNotification(eventType, {
      userId: userId || req.user?.id,
      claimNumber: claimNumber || 'CLM-100293',
      amount: amount || 45000,
      patientName: 'Self',
      comments: comments || 'Test templates comments details.',
      role: role || req.user?.role,
      txnRef: 'TXN-90291929312',
      bankAccount: 'SBI-xxxx3829'
    });
    return res.status(200).json({ success: true, message: 'Test notification triggered successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;

