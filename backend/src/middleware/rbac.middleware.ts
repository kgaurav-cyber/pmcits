import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

export const requireRoles = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required for this operation.', code: 'UNAUTHORIZED' }
      });
    }

    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: { 
          message: `Forbidden: Access restricted to the following roles: [${allowedRoles.join(', ')}]. Current role: ${userRole}`, 
          code: 'FORBIDDEN' 
        }
      });
    }

    next();
  };
};
