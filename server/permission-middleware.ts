import { Request, Response, NextFunction } from 'express';
import { can, hasPermission, type Permission, type Role } from '@shared/permissions';
import { type User } from '@shared/schema';

// Middleware to check if user has specific permission
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Middleware to check if user has specific role
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Middleware to check if user can perform action with context
export function requirePermissionWithContext(
  permission: Permission,
  getContext: (req: Request) => { isOwnFirm?: boolean }
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const context = getContext(req);
    
    if (!can(req.user, permission, context)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Helper to check if user is accessing their own company's resources
export function requireOwnCompany() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { companyId } = req.query;
    const bodyCompanyId = req.body?.companyId;
    const targetCompanyId = companyId || bodyCompanyId;

    // Admin can access any company
    if (req.user.role === 'admin') {
      return next();
    }

    // Accountants can access their current company
    if (req.user.role === 'accountant' && req.user.currentCompanyId) {
      if (parseInt(targetCompanyId as string) === req.user.currentCompanyId) {
        return next();
      }
    }

    // Regular users can only access their own company
    if (req.user.companyId && parseInt(targetCompanyId as string) === req.user.companyId) {
      return next();
    }

    return res.status(403).json({ error: 'Access denied to this company' });
  };
}

// Helper to check if user is accessing their own firm's resources
export function requireOwnFirm() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { firmId } = req.params;
    const bodyFirmId = req.body?.firmId;
    const targetFirmId = firmId || bodyFirmId;

    // Only accountants with a firm can access firm resources
    if (req.user.role !== 'accountant' || !req.user.firmId) {
      return res.status(403).json({ error: 'Access denied to firm resources' });
    }

    // Accountants can only access their own firm
    if (parseInt(targetFirmId as string) !== req.user.firmId) {
      return res.status(403).json({ error: 'Access denied to this firm' });
    }

    next();
  };
}
