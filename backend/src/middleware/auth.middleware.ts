import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'Employee' | 'Medical Officer' | 'Accounts Officer' | 'DDO' | 'Treasury' | 'Administrator';
    district: string;
  };
}

export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Missing or malformed Authorization header.', code: 'UNAUTHORIZED' }
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Call Supabase Auth API to retrieve user identity from JWT
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired authentication token.', code: 'UNAUTHORIZED' }
      });
    }

    if (user.user_metadata?.is_disabled) {
      return res.status(403).json({
        success: false,
        error: { message: 'Your account has been disabled. Contact administrator.', code: 'FORBIDDEN' }
      });
    }

    // Fetch the detailed profile including role and district scope
    const { data: profile, error: dbError } = await supabaseAdmin
      .from('profiles')
      .select('role, district')
      .eq('id', user.id)
      .single();

    if (dbError || !profile) {
      return res.status(403).json({
        success: false,
        error: { message: 'User profile record not found in system database.', code: 'FORBIDDEN' }
      });
    }

    // Attach user metadata to Request context
    req.user = {
      id: user.id,
      email: user.email || '',
      role: profile.role,
      district: profile.district
    };

    next();
  } catch (error) {
    logger.error('Error verifying authentication token', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Internal server error during authentication.', code: 'INTERNAL_ERROR' }
    });
  }
};
