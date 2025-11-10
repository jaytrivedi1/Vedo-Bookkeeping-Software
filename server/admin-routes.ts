import express, { Request, Response } from "express";
import { storage } from "./storage";
import { requireAuth, requireAdmin } from "./auth";

export const adminRouter = express.Router();

// All admin routes require authentication and admin role
adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

// Get all users with their company associations
adminRouter.get("/users", async (req: Request, res: Response) => {
  try {
    const users = await storage.getUsers();
    
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

// Get all companies with user counts
adminRouter.get("/companies", async (req: Request, res: Response) => {
  try {
    const companies = await storage.getCompanies();
    
    // Get user count for each company
    const companiesWithUserCounts = await Promise.all(
      companies.map(async (company) => {
        const companyUsers = await storage.getCompanyUsers(company.id);
        return {
          ...company,
          userCount: companyUsers.length,
          users: companyUsers,
        };
      })
    );
    
    res.json(companiesWithUserCounts);
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
