import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { UserService } from '../services/user.service';
import { z } from 'zod';

const VALID_ROLES = ['Employee', 'Medical Officer', 'Accounts Officer', 'DDO', 'Treasury', 'Administrator'] as const;
type UserRole = typeof VALID_ROLES[number];

const createEmployeeSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  district: z.string().min(1, 'District is required'),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  gpf_cps_number: z.string().min(1, 'GPF/CPS number is required'),
  employee_id: z.string().optional(),
  rank: z.string().min(1, 'Rank is required'),
  designation: z.string().min(1, 'Designation is required'),
  police_unit: z.string().optional(),
  joining_date: z.string().optional(),
  bank_account_no: z.string().min(5, 'Valid bank account number required'),
  bank_ifsc: z.string().min(5, 'Valid IFSC code required'),
  role: z.enum(VALID_ROLES).optional().default('Employee')
});

const updateEmployeeSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  district: z.string().min(1, 'District is required'),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  gpf_cps_number: z.string().min(1, 'GPF/CPS number is required'),
  employee_id: z.string().optional(),
  rank: z.string().min(1, 'Rank is required'),
  designation: z.string().min(1, 'Designation is required'),
  police_unit: z.string().optional(),
  joining_date: z.string().optional(),
  bank_account_no: z.string().min(5),
  bank_ifsc: z.string().min(5),
  role: z.enum(VALID_ROLES),
  status: z.string().optional()
});

export class UserController {
  private userService = new UserService();

  listUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const search = req.query.search as string | undefined;
      const roleFilter = req.query.role as string | undefined;
      const status = req.query.status as string | undefined;
      const users = await this.userService.listUsers(search, roleFilter, status);

      return res.status(200).json({ success: true, data: users, total: users.length });
    } catch (error) {
      next(error);
    }
  };

  getUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id;
      const user = await this.userService.getUserById(userId);
      return res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  };

  createEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const parsed = createEmployeeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.errors }
        });
      }

      const result = await this.userService.createEmployee(req.user.id, parsed.data);
      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  updateEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const userId = req.params.id;
      const parsed = updateEmployeeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.errors }
        });
      }

      await this.userService.updateEmployee(req.user.id, userId, parsed.data);
      return res.status(200).json({ success: true, message: 'Employee updated successfully.' });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const userId = req.params.id;
      const { custom_password } = req.body;
      const tempPassword = await this.userService.resetPassword(req.user.id, userId, custom_password);

      return res.status(200).json({ success: true, data: { temp_password: tempPassword }, message: 'Password reset successful.' });
    } catch (error) {
      next(error);
    }
  };

  toggleStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const userId = req.params.id;
      const { disabled } = req.body;

      if (typeof disabled !== 'boolean') {
        return res.status(400).json({ success: false, error: { message: 'Invalid disabled parameter. Must be boolean.' } });
      }

      await this.userService.toggleUserStatus(req.user.id, userId, disabled);
      return res.status(200).json({ success: true, message: `Account ${disabled ? 'disabled' : 'enabled'} successfully.` });
    } catch (error) {
      next(error);
    }
  };

  assignRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const userId = req.params.id;
      const { role } = req.body;

      if (!role || !VALID_ROLES.includes(role)) {
        return res.status(400).json({ success: false, error: { message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` } });
      }

      await this.userService.assignRole(req.user.id, userId, role);
      return res.status(200).json({ success: true, message: 'Role updated successfully.' });
    } catch (error) {
      next(error);
    }
  };

  bulkImport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'rows must be a non-empty array.' } });
      }

      const result = await this.userService.bulkImport(req.user.id, rows);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  sendOnboardingEmails = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const { jobId, accounts } = req.body;
      if (!Array.isArray(accounts) || accounts.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'accounts must be a non-empty array.' } });
      }

      const result = await this.userService.sendOnboardingEmails(req.user.id, jobId || null, accounts);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getImportJobs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const jobs = await this.userService.getImportJobs();
      return res.status(200).json({ success: true, data: jobs });
    } catch (error) {
      next(error);
    }
  };

  getImportJobReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const jobId = req.params.id;
      const report = await this.userService.getImportJobReport(jobId);
      return res.status(200).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  };

  retryFailedEmails = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const jobId = req.params.id;
      const result = await this.userService.retryFailedEmails(req.user.id, jobId);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  regenerateJobCredentials = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const jobId = req.params.id;
      const credentials = await this.userService.regenerateJobPasswords(req.user.id, jobId);
      return res.status(200).json({ success: true, data: credentials });
    } catch (error) {
      next(error);
    }
  };

  unlockUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const userId = req.params.id;
      await this.userService.unlockUser(req.user.id, userId);
      return res.status(200).json({ success: true, message: 'User account unlocked successfully.' });
    } catch (error) {
      next(error);
    }
  };

  getAuditLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.query.user_id as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await this.userService.getAuditLogs(userId, limit);
      return res.status(200).json({ success: true, data: logs });
    } catch (error) {
      next(error);
    }
  };
}
