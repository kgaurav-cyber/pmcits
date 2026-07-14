import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import { AIService } from './ai.service';

const router = Router();
const service = new AIService();

router.use(authenticateJWT);

/**
 * @swagger
 * /api/ai/claims/{id}/analyze:
 *   post:
 *     summary: Run system security audit and GPT-4o analysis on a claim
 *     security:
 *       - bearerAuth: []
 */
router.post('/claims/:id/analyze', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const analysis = await service.runSecurityAudit(req.params.id);
    return res.status(200).json({ success: true, data: analysis });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ai/claims/{id}/full-analysis:
 *   post:
 *     summary: Run full AI pipeline — audit + risk recommendation — for Medical Officers
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/claims/:id/full-analysis',
  requireRoles(['Medical Officer', 'Accounts Officer', 'DDO', 'Administrator']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const analysis = await service.runFullAnalysis(req.params.id);
      return res.status(200).json({ success: true, data: analysis });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/ai/claims/{id}/assistant:
 *   post:
 *     summary: Chat with the Officer AI Copilot regarding a claim details
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/claims/:id/assistant',
  requireRoles(['Medical Officer', 'Accounts Officer', 'DDO', 'Treasury', 'Administrator']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { question } = req.body;
      if (!question) {
        return res.status(400).json({
          success: false,
          error: { message: 'Missing question in request body.', code: 'BAD_REQUEST' }
        });
      }
      const answer = await service.askOfficerAssistant(req.params.id, question);
      return res.status(200).json({ success: true, data: { answer } });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/ai/extract-ocr:
 *   post:
 *     summary: Basic invoice OCR extraction via GPT-4o
 *     security:
 *       - bearerAuth: []
 */
router.post('/extract-ocr', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { file_url } = req.body;
    if (!file_url) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing file_url in request body.', code: 'BAD_REQUEST' }
      });
    }
    const extracted = await service.extractInvoiceFromDocument(file_url);
    return res.status(200).json({ success: true, data: extracted });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ai/analyze-document:
 *   post:
 *     summary: Full multi-field OCR for Prescriptions, Bills, Discharge Summaries, Diagnostic Reports
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               file_url:
 *                 type: string
 *               document_type:
 *                 type: string
 *                 enum: [Bill, Prescription, Discharge Summary, Diagnostic Report]
 */
router.post('/analyze-document', requireRoles(['Employee', 'Medical Officer', 'Accounts Officer', 'DDO', 'Administrator']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { file_url, document_type } = req.body;
    if (!file_url) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing file_url in request body.', code: 'BAD_REQUEST' }
      });
    }
    const extracted = await service.analyzeDocument(file_url, document_type);
    return res.status(200).json({ success: true, data: extracted });
  } catch (error) {
    next(error);
  }
});

export default router;
