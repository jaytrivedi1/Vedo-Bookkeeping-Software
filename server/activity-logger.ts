import type { Request } from "express";
import type { IStorage } from "./storage";
import type { InsertActivityLog } from "@shared/schema";

/**
 * Helper function to log user activities
 * Now includes companyId for multi-tenant data isolation
 */
export async function logActivity(
  storage: IStorage,
  req: Request,
  action: string,
  entityType: string | null = null,
  entityId: number | null = null,
  details: Record<string, any> | null = null
): Promise<void> {
  try {
    const userId = (req.user as any)?.id || null;
    const companyId = (req as any).companyId || null; // Company context for isolation
    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const userAgent = req.get('user-agent') || null;

    const activityLog: InsertActivityLog = {
      userId,
      companyId,
      action,
      entityType,
      entityId,
      details,
      ipAddress,
      userAgent,
    };

    await storage.createActivityLog(activityLog);
  } catch (error) {
    // Log the error but don't throw - we don't want activity logging to break the main flow
    console.error("Failed to log activity:", error);
  }
}
