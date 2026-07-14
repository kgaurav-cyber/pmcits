import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import { ReportsService } from './reports.service';

const router = Router();
const service = new ReportsService();

router.use(authenticateJWT);

/**
 * @swagger
 * /api/reports/dashboard-stats:
 *   get:
 *     summary: Retrieve aggregate dashboard counts and budget totals
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics counts
 */
router.get('/dashboard-stats', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    const stats = await service.getDashboardStats(req.user.role, req.user.district);
    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/sla-compliance:
 *   get:
 *     summary: Fetch SLA stage compliance average metrics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of average days taken per stage
 */
router.get('/sla-compliance', requireRoles(['Administrator', 'DDO', 'Treasury']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const list = await service.getSLACompliance();
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/district-expenditure:
 *   get:
 *     summary: Fetch reimbursement aggregates divided by police districts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of district budgets
 */
router.get('/district-expenditure', requireRoles(['Administrator', 'Treasury']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const list = await service.getDistrictExpenditures();
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/monthly:
 *   get:
 *     summary: Fetch monthly claims counts and spending budgets
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly aggregate details
 */
router.get('/monthly', requireRoles(['Administrator', 'Treasury', 'DDO']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const list = await service.getMonthlyReports();
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/hospitals:
 *   get:
 *     summary: Fetch disbursements metrics grouped by hospital
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hospital aggregate details
 */
router.get('/hospitals', requireRoles(['Administrator', 'Treasury', 'DDO']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const list = await service.getHospitalReports();
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/workloads:
 *   get:
 *     summary: Fetch claims audit workloads counts per reviewer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Officer workloads
 */
router.get('/workloads', requireRoles(['Administrator', 'DDO']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const list = await service.getOfficerWorkload();
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/payments:
 *   get:
 *     summary: Fetch list of payment transfer disbursement history
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment transactions log
 */
router.get('/payments', requireRoles(['Administrator', 'Treasury', 'DDO']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const list = await service.getPaymentReports();
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

router.get('/claims-by-status', requireRoles(['Administrator', 'DDO', 'Treasury', 'Medical Officer', 'Accounts Officer']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const statusGroup = (req.query.group as 'pending' | 'approved' | 'rejected') || 'pending';
    const list = await service.getClaimsByStatus(statusGroup);
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

router.get('/fraud-alerts', requireRoles(['Administrator', 'DDO', 'Medical Officer', 'Accounts Officer']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const list = await service.getFraudAlerts();
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/export/csv:
 *   get:
 *     summary: Export data format as CSV file attachment
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Raw CSV file stream
 */
router.get('/export/csv', requireRoles(['Administrator', 'Treasury', 'DDO']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const reportType = (req.query.type as string) || 'monthly';
    const csvContent = await service.generateCSVExport(reportType);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=pmcits_${reportType}_report.csv`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/export/excel:
 *   get:
 *     summary: Export data formatted for Microsoft Excel
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Excel spreadsheet CSV download
 */
router.get('/export/excel', requireRoles(['Administrator', 'Treasury', 'DDO']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const reportType = (req.query.type as string) || 'monthly';
    const csvContent = await service.generateCSVExport(reportType);

    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename=pmcits_${reportType}_report.xls`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/export/pdf:
 *   get:
 *     summary: Export simulated PDF report file
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: PDF file binary download
 */
router.get('/export/pdf', requireRoles(['Administrator', 'Treasury', 'DDO']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const reportType = (req.query.type as string) || 'monthly';
    
    // Simulate standard PDF generation
    const mockPDF = `%PDF-1.4\n1 0 obj\n<< /Title (PMCITS Audit Report - ${reportType}) >>\nendobj\n%%EOF`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=pmcits_${reportType}_report.pdf`);
    return res.status(200).send(Buffer.from(mockPDF, 'utf-8'));
  } catch (error) {
    next(error);
  }
});

export default router;

