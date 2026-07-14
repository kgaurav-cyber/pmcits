import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { UserService } from '../services/user.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(2),
  district: z.string(),
  phone: z.string().optional(),
  gpf_cps_number: z.string(),
  rank: z.string(),
  designation: z.string(),
  bank_account_no: z.string(),
  bank_ifsc: z.string()
});

const loginSchema = z.object({
  email: z.string().min(1, 'Email or Employee ID is required'),
  password: z.string()
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
  redirect_to: z.string().optional()
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token code is required'),
  password: z.string().min(6, 'Password must be at least 6 characters long')
});

const changePasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  currentPassword: z.string().optional()
});

import { logAudit } from '../utils/audit';

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
};

export class AuthController {
  private authService = new AuthService();
  private userService = new UserService();

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.errors }
        });
      }

      const result = await this.authService.registerEmployee(parsed.data);
      
      // Log audit
      await logAudit(
        result.userId,
        'EMPLOYEE_CREATION',
        getClientIp(req),
        'profiles',
        result.userId,
        {},
        { email: result.email, full_name: result.full_name, role: 'Employee' }
      );

      return res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.errors }
        });
      }

      const result = await this.authService.login(parsed.data);

      // Log audit
      await logAudit(
        result.user.id,
        'LOGIN',
        getClientIp(req),
        'profiles',
        result.user.id,
        {},
        { email: result.user.email, role: result.user.role }
      );

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const authHeader = req.headers.authorization;
      const token = authHeader ? authHeader.split(' ')[1] : '';
      await this.authService.logout(token);

      // Log audit
      await logAudit(
        req.user.id,
        'LOGOUT',
        getClientIp(req),
        'profiles',
        req.user.id,
        {},
        {}
      );

      return res.status(200).json({
        success: true,
        message: 'Successfully logged out all sessions.'
      });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.errors }
        });
      }

      await this.authService.forgotPassword(parsed.data.email, parsed.data.redirect_to);
      return res.status(200).json({
        success: true,
        message: 'Recovery email dispatched successfully if account exists.'
      });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.errors }
        });
      }

      await this.authService.resetPassword(parsed.data.token, parsed.data.password);
      return res.status(200).json({
        success: true,
        message: 'Password has been reset successfully.'
      });
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.errors }
        });
      }

      await this.authService.changePassword(req.user.id, parsed.data.password, parsed.data.currentPassword);

      // Log audit
      await logAudit(
        req.user.id,
        'PASSWORD_RESET',
        getClientIp(req),
        'profiles',
        req.user.id,
        {},
        { comments: 'User self password reset completed' }
      );

      return res.status(200).json({
        success: true,
        message: 'Password updated successfully.'
      });
    } catch (error) {
      next(error);
    }
  };

  profile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      const userProfile = await this.userService.getUserById(req.user.id);
      return res.status(200).json({
        success: true,
        data: userProfile
      });
    } catch (error) {
      next(error);
    }
  };
}

