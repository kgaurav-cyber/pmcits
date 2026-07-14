import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ClaimService } from '../services/claim.service';
import { 
  createClaimSchema,
  claimObjectSchema,
  submitClaimSchema, 
  approveClaimSchema, 
  returnClaimSchema 
} from '../validators/claim.validator';
import { logAudit } from '../utils/audit';

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
};

export class ClaimController {
  private claimService = new ClaimService();

  submitClaim = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const parsed = createClaimSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.errors }
        });
      }

      const { bill_items, ...claimData } = parsed.data;
      const claim = await this.claimService.submitClaim(req.user.id, claimData, bill_items || []);

      // Log audit
      await logAudit(
        req.user.id,
        'CLAIM_SUBMISSION',
        getClientIp(req),
        'claims',
        claim.id,
        {},
        { claim_number: claim.claim_number, total_amount_claimed: claim.total_amount_claimed }
      );

      return res.status(201).json({
        success: true,
        data: claim
      });
    } catch (error) {
      next(error);
    }
  };

  saveDraft = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const parsed = claimObjectSchema.safeParse(req.body);
      if (!parsed.success) {
        require('fs').writeFileSync('draft_validation_error.log', JSON.stringify({ errors: parsed.error.errors, body: req.body }, null, 2));
        console.error('Draft validation failed:', JSON.stringify(parsed.error.errors, null, 2));
        console.error('Payload was:', JSON.stringify(req.body, null, 2));
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.errors }
        });
      }

      const { claim_id, bill_items, ...claimData } = parsed.data as any; // claim_id might be passed if updating
      const claim = await this.claimService.saveDraft(req.user.id, claim_id, claimData, bill_items || []);

      return res.status(200).json({
        success: true,
        data: claim
      });
    } catch (error) {
      next(error);
    }
  };

  submitFinalClaim = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      const claimId = req.params.id;

      const parsed = submitClaimSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.errors }
        });
      }

      const { bill_items, ...claimData } = parsed.data as any;
      const claim = await this.claimService.submitFinalClaim(req.user.id, claimId, claimData, bill_items || []);

      // Log audit
      await logAudit(
        req.user.id,
        'CLAIM_SUBMISSION',
        getClientIp(req),
        'claims',
        claim.id,
        {},
        { claim_number: claim.claim_number, total_amount_claimed: claim.total_amount_claimed }
      );

      return res.status(200).json({
        success: true,
        data: claim
      });
    } catch (error) {
      next(error);
    }
  };

  getClaim = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const claimId = req.params.id;
      const claim = await this.claimService.getClaim(req.user.id, req.user.role, req.user.district, claimId);

      return res.status(200).json({
        success: true,
        data: claim
      });
    } catch (error) {
      next(error);
    }
  };

  getQueue = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const status = req.query.status as string | undefined;
      const employeeId = req.query.employee_id as string | undefined;
      const queue = await this.claimService.getQueue(req.user.id, req.user.role, req.user.district, status, employeeId);

      return res.status(200).json({
        success: true,
        data: queue
      });
    } catch (error) {
      next(error);
    }
  };

  processWorkflowAction = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const claimId = req.params.id;
      const { action, remarks, eligibleAmount, utrNumber, paymentDate, sanction_number, sanction_date } = req.body;

      if (!action || !['approve', 'return', 'reject'].includes(action)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid action' } });
      }

      let updated;
      const approvalData = {
        comments: remarks,
        total_eligible: eligibleAmount,
        utr_number: utrNumber,
        payment_date: paymentDate,
        sanction_number,
        sanction_date
      };

      if (action === 'approve') {
        updated = await this.claimService.approveClaim(req.user.id, req.user.role, req.user.district, claimId, approvalData);
      } else if (action === 'return') {
        updated = await this.claimService.returnClaim(req.user.id, req.user.role, req.user.district, claimId, remarks || '');
      } else if (action === 'reject') {
        updated = await this.claimService.rejectClaim(req.user.id, req.user.role, req.user.district, claimId, remarks || '');
      }

      await logAudit(
        req.user.id,
        `WORKFLOW_${action.toUpperCase()}`,
        getClientIp(req),
        'claims',
        claimId,
        {},
        { status: updated.status }
      );

      return res.status(200).json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  };

  approveClaim = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const claimId = req.params.id;
      const parsed = approveClaimSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.errors }
        });
      }

      const updated = await this.claimService.approveClaim(
        req.user.id,
        req.user.role,
        req.user.district,
        claimId,
        parsed.data
      );

      // Log audit
      const action = req.user.role === 'Treasury' ? 'PAYMENT' : 'APPROVAL';
      await logAudit(
        req.user.id,
        action,
        getClientIp(req),
        'claims',
        claimId,
        {},
        { status: updated.status, total_amount_approved: updated.total_amount_approved }
      );

      return res.status(200).json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  };

  returnClaim = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const claimId = req.params.id;
      const parsed = returnClaimSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.errors }
        });
      }

      const updated = await this.claimService.returnClaim(
        req.user.id,
        req.user.role,
        req.user.district,
        claimId,
        parsed.data.comments
      );

      // Log audit
      await logAudit(
        req.user.id,
        'RETURN',
        getClientIp(req),
        'claims',
        claimId,
        {},
        { status: updated.status }
      );

      return res.status(200).json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  };

  rejectClaim = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const claimId = req.params.id;
      const parsed = returnClaimSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.errors }
        });
      }

      const updated = await this.claimService.rejectClaim(
        req.user.id,
        req.user.role,
        req.user.district,
        claimId,
        parsed.data.comments
      );

      // Log audit
      await logAudit(
        req.user.id,
        'REJECTION',
        getClientIp(req),
        'claims',
        claimId,
        {},
        { status: updated.status }
      );

      return res.status(200).json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  };

  requestUploadSignature = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const claimId = req.params.id;
      const { file_name, category } = req.body;

      if (!file_name || !category) {
        return res.status(400).json({
          success: false,
          error: { message: 'Missing file_name or category parameters.', code: 'BAD_REQUEST' }
        });
      }

      const uploadMeta = await this.claimService.requestUploadSignature(
        req.user.id,
        claimId,
        file_name,
        category
      );

      return res.status(200).json({
        success: true,
        data: uploadMeta
      });
    } catch (error) {
      next(error);
    }
  };

  downloadSanctionOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const claimId = req.params.id;
      // Re-use getClaim to verify user has access (district/ownership checks apply)
      const claim = await this.claimService.getClaim(req.user.id, req.user.role, req.user.district, claimId);

      if (!['Approved by DDO', 'Treasury Processing', 'Paid'].includes(claim.status)) {
        return res.status(400).json({ success: false, error: { message: 'Sanction order is only available for approved claims.' } });
      }

      // Simulate standard PDF generation
      const mockPDF = `%PDF-1.4\n1 0 obj\n<< /Title (PMCITS Sanction Order - ${claim.claim_number}) >>\nendobj\n%%EOF`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=sanction_order_${claim.claim_number}.pdf`);
      return res.status(200).send(Buffer.from(mockPDF, 'utf-8'));
    } catch (error) {
      next(error);
    }
  };
}
