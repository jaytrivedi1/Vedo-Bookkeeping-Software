/**
 * Company Context Middleware
 *
 * This middleware ensures proper multi-tenant data isolation by:
 * 1. Getting the user's authorized companies from the database
 * 2. Setting the current company ID on the request object
 * 3. Rejecting requests if user has no company access
 *
 * All routes that need company-scoped data should be placed after this middleware.
 */

import { Request, Response, NextFunction } from "express";
import { IStorage } from "../storage";

// Extend Express Request type to include company context
declare global {
  namespace Express {
    interface Request {
      companyId?: number;
      authorizedCompanyIds?: number[];
    }
  }
}

// Routes that don't require company context
const EXCLUDED_PATHS = [
  '/api/auth',
  '/api/login',
  '/api/logout',
  '/api/register',
  '/api/user',
  '/api/admin',
  '/api/companies', // Company routes handle their own scoping
  '/api/verify-email',
  '/api/resend-verification',
  '/api/forgot-password',
  '/api/reset-password',
  '/api/validate-reset-token',
  '/api/validate-password',
  '/api/test-resend',
  '/api/invoices/public', // Public invoice viewing
];

/**
 * Check if a path should be excluded from company context requirement
 */
function isExcludedPath(path: string): boolean {
  return EXCLUDED_PATHS.some(excluded => path.startsWith(excluded));
}

/**
 * Company context middleware factory
 *
 * @param storage - The storage instance for database access
 * @returns Express middleware function
 */
export function companyContextMiddleware(storage: IStorage) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip excluded paths
    if (isExcludedPath(req.path)) {
      return next();
    }

    // Skip if not authenticated (auth middleware will handle this)
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return next();
    }

    try {
      const userId = req.user.id;

      // Get user's company assignments
      const userCompanies = await storage.getUserCompanies(userId);

      // If user has no company assignments, deny access to company-scoped routes
      if (userCompanies.length === 0) {
        // Allow the request to proceed - route handlers will check for companyId
        // This allows users to access onboarding/setup routes
        req.companyId = undefined;
        req.authorizedCompanyIds = [];
        return next();
      }

      // Store all authorized company IDs for access verification
      req.authorizedCompanyIds = userCompanies.map(uc => uc.companyId);

      // Determine current company:
      // 1. Check for primary company assignment
      // 2. Fall back to first company
      const primaryAssignment = userCompanies.find(uc => uc.isPrimary);
      req.companyId = primaryAssignment
        ? primaryAssignment.companyId
        : userCompanies[0].companyId;

      next();
    } catch (error) {
      console.error("[CompanyContext] Error setting company context:", error);
      res.status(500).json({ message: "Failed to establish company context" });
    }
  };
}

/**
 * Helper to verify user has access to a specific company
 * Use this when a route receives a companyId parameter
 */
export function verifyCompanyAccess(req: Request, companyId: number): boolean {
  if (!req.authorizedCompanyIds) {
    return false;
  }
  return req.authorizedCompanyIds.includes(companyId);
}

/**
 * Middleware that requires company context to be set
 * Use on routes that absolutely need a company context
 */
export function requireCompanyContext(req: Request, res: Response, next: NextFunction) {
  if (!req.companyId) {
    return res.status(400).json({
      message: "No company selected. Please select or create a company first."
    });
  }
  next();
}

/**
 * Get the current company ID from request
 * Throws an error if no company context is set
 */
export function getCompanyId(req: Request): number {
  if (!req.companyId) {
    throw new Error("No company context available");
  }
  return req.companyId;
}
