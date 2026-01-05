import express, { Request, Response } from "express";
import { storage } from "./storage";
import { requireAuth, requireAdmin } from "./auth";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

export const adminRouter = express.Router();

// Initialize Plaid client for bank feed disconnection
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});
const plaidClient = new PlaidApi(plaidConfig);

// All admin routes require authentication and admin role
adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

// Get all users with their company associations
adminRouter.get("/users", async (req: Request, res: Response) => {
  try {
    // Include inactive users so admin can see all users in the system
    const users = await storage.getUsers({ includeInactive: true });
    
    // Get company associations for each user
    const usersWithCompanies = await Promise.all(
      users.map(async (user) => {
        const userCompanies = await storage.getUserCompanies(user.id);
        return {
          ...user,
          // Don't send password hash to frontend
          password: undefined,
          companies: userCompanies,
        };
      })
    );
    
    res.json(usersWithCompanies);
  } catch (error) {
    console.error("Error fetching users for admin:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Get all companies with user counts, bank feed status, and preferences
adminRouter.get("/companies", async (req: Request, res: Response) => {
  try {
    const companies = await storage.getCompanies();
    const preferences = await storage.getPreferences();
    const bankConnections = await storage.getBankConnections();
    
    // Get user count for each company and enrich with additional data
    // Note: Bank connections are currently global (not company-specific in the schema)
    // We only show them on the first/default company to avoid confusion
    const defaultCompanyId = companies.find(c => c.isDefault)?.id || companies[0]?.id;
    
    const companiesWithDetails = await Promise.all(
      companies.map(async (company) => {
        const companyUsers = await storage.getCompanyUsers(company.id);
        
        // Only attach bank connections to the default company for now
        // This is a temporary solution until company-specific bank connections are implemented
        const isDefaultCompany = company.id === defaultCompanyId;
        
        return {
          ...company,
          userCount: companyUsers.length,
          users: companyUsers,
          homeCurrency: preferences?.homeCurrency || 'USD',
          bankFeedCount: isDefaultCompany ? bankConnections.filter(bc => bc.status === 'active').length : 0,
          bankConnections: isDefaultCompany ? bankConnections.map(bc => ({
            id: bc.id,
            institutionName: bc.institutionName,
            status: bc.status,
            lastSync: bc.lastSync,
          })) : [],
        };
      })
    );
    
    res.json(companiesWithDetails);
  } catch (error) {
    console.error("Error fetching companies for admin:", error);
    res.status(500).json({ message: "Failed to fetch companies" });
  }
});

// Get detailed user information by ID
adminRouter.get("/users/:id", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const userCompanies = await storage.getUserCompanies(userId);
    
    res.json({
      ...user,
      password: undefined,
      companies: userCompanies,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Failed to fetch user details" });
  }
});

// Get detailed company information by ID
adminRouter.get("/companies/:id", async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.id);
    const company = await storage.getCompany(companyId);
    
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    
    const companyUsers = await storage.getCompanyUsers(companyId);
    
    res.json({
      ...company,
      users: companyUsers,
    });
  } catch (error) {
    console.error("Error fetching company details:", error);
    res.status(500).json({ message: "Failed to fetch company details" });
  }
});

// Update user status (activate/deactivate)
adminRouter.patch("/users/:id/status", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: "isActive must be a boolean" });
    }
    
    const updatedUser = await storage.updateUser(userId, { isActive });
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({
      ...updatedUser,
      password: undefined,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ message: "Failed to update user status" });
  }
});

// Update company status (activate/deactivate)
adminRouter.patch("/companies/:id/status", async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.id);
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: "isActive must be a boolean" });
    }
    
    const updatedCompany = await storage.updateCompany(companyId, { isActive });
    
    if (!updatedCompany) {
      return res.status(404).json({ message: "Company not found" });
    }
    
    res.json(updatedCompany);
  } catch (error) {
    console.error("Error updating company status:", error);
    res.status(500).json({ message: "Failed to update company status" });
  }
});

// Disconnect bank feed connection (for super admin)
adminRouter.delete("/bank-connections/:id", async (req: Request, res: Response) => {
  try {
    const connectionId = parseInt(req.params.id);
    
    // Get the connection first to retrieve the access token
    const connection = await storage.getBankConnection(connectionId);
    
    if (!connection) {
      return res.status(404).json({ message: "Bank connection not found" });
    }
    
    // Try to revoke the Plaid access token (best effort)
    try {
      if (connection.accessToken && plaidClient) {
        await plaidClient.itemRemove({
          access_token: connection.accessToken,
        });
        console.log(`Successfully revoked Plaid access token for connection ${connectionId}`);
      }
    } catch (plaidError) {
      // Log but don't fail - we still want to remove from our database
      console.error("Error revoking Plaid access token:", plaidError);
    }
    
    // Delete the connection from our database (this cascades to bank accounts and transactions)
    const deleted = await storage.deleteBankConnection(connectionId);
    
    if (!deleted) {
      return res.status(500).json({ message: "Failed to delete bank connection" });
    }
    
    res.json({ message: "Bank connection disconnected successfully" });
  } catch (error) {
    console.error("Error disconnecting bank connection:", error);
    res.status(500).json({ message: "Failed to disconnect bank connection" });
  }
});

// Get all bank connections for admin view
adminRouter.get("/bank-connections", async (req: Request, res: Response) => {
  try {
    const connections = await storage.getBankConnections();
    
    // Enrich with account counts
    const connectionsWithDetails = await Promise.all(
      connections.map(async (connection) => {
        const accounts = await storage.getBankAccountsByConnectionId(connection.id);
        return {
          id: connection.id,
          institutionName: connection.institutionName,
          institutionId: connection.institutionId,
          status: connection.status,
          lastSync: connection.lastSync,
          error: connection.error,
          accountCount: accounts.length,
          accounts: accounts.map(acc => ({
            id: acc.id,
            name: acc.name,
            type: acc.type,
            mask: acc.mask,
            isActive: acc.isActive,
          })),
          createdAt: connection.createdAt,
        };
      })
    );
    
    res.json(connectionsWithDetails);
  } catch (error) {
    console.error("Error fetching bank connections for admin:", error);
    res.status(500).json({ message: "Failed to fetch bank connections" });
  }
});
