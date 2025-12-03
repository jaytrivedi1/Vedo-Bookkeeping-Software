import express, { Request, Response } from "express";
import { storage } from "./storage";
import { insertCompaniesSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

export const companyRouter = express.Router();

// Configure multer for company logo uploads
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'company-logos');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const companyId = req.params.id;
    const ext = path.extname(file.originalname);
    cb(null, `company-${companyId}${ext}`);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG images are allowed.'));
    }
  }
});

// Get companies for the authenticated user
companyRouter.get("/", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const userId = req.user.id;
    
    // Get user's company assignments
    const userCompanies = await storage.getUserCompanies(userId);
    
    // If user has no company assignments, return empty array
    if (userCompanies.length === 0) {
      return res.json([]);
    }
    
    // Get the actual company objects for each assignment
    const companies = await Promise.all(
      userCompanies.map(async (uc) => {
        const company = await storage.getCompany(uc.companyId);
        return company;
      })
    );
    
    // Filter out any null values (in case a company was deleted)
    const validCompanies = companies.filter(c => c !== null && c !== undefined);
    
    res.json(validCompanies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ message: "Failed to fetch companies" });
  }
});

// Get user's default company (tenant-aware)
companyRouter.get("/default", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const userId = req.user.id;
    
    // Get user's company assignments
    const userCompanies = await storage.getUserCompanies(userId);
    
    // If user has no company assignments, return 404
    if (userCompanies.length === 0) {
      return res.status(404).json({ message: "No companies found for user" });
    }
    
    // First check if the user has a primary company assignment
    const primaryAssignment = userCompanies.find(uc => uc.isPrimary);
    
    if (primaryAssignment) {
      const company = await storage.getCompany(primaryAssignment.companyId);
      if (company) {
        return res.json(company);
      }
    }
    
    // Otherwise return the first company they have access to
    const firstCompany = await storage.getCompany(userCompanies[0].companyId);
    if (firstCompany) {
      return res.json(firstCompany);
    }
    
    return res.status(404).json({ message: "No accessible companies found" });
  } catch (error) {
    console.error("Error fetching default company:", error);
    res.status(500).json({ message: "Failed to fetch default company" });
  }
});

// Get specific company by ID
companyRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const company = await storage.getCompany(id);
    
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    
    res.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    res.status(500).json({ message: "Failed to fetch company" });
  }
});

// Create new company
companyRouter.post("/", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const companyData = insertCompaniesSchema.parse(req.body);
    const company = await storage.createCompany(companyData);
    
    // Automatically assign the creating user to this company as admin
    await storage.assignUserToCompany({
      userId: req.user.id,
      companyId: company.id,
      role: 'admin'
    });
    
    res.status(201).json(company);
  } catch (error) {
    console.error("Error creating company:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid company data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to create company" });
  }
});

// Update company
companyRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const companyData = insertCompaniesSchema.partial().parse(req.body);
    const company = await storage.updateCompany(id, companyData);
    
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    
    res.json(company);
  } catch (error) {
    console.error("Error updating company:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid company data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to update company" });
  }
});

// Set default company
companyRouter.post("/:id/set-default", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const company = await storage.setDefaultCompany(id);
    
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    
    res.json(company);
  } catch (error) {
    console.error("Error setting default company:", error);
    res.status(500).json({ message: "Failed to set default company" });
  }
});

// Upload company logo
companyRouter.post("/:id/logo", logoUpload.single('logo'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    // Get the existing company to check for old logo
    const existingCompany = await storage.getCompany(id);
    if (!existingCompany) {
      // Clean up uploaded file since company doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Company not found" });
    }
    
    // Delete old logo file if it exists and is different
    if (existingCompany.logoUrl) {
      // Remove leading slash from logoUrl to prevent path issues
      const logoUrlPath = existingCompany.logoUrl.startsWith('/') 
        ? existingCompany.logoUrl.substring(1) 
        : existingCompany.logoUrl;
      const oldLogoPath = path.join(process.cwd(), 'public', logoUrlPath);
      if (fs.existsSync(oldLogoPath) && oldLogoPath !== req.file.path) {
        try {
          fs.unlinkSync(oldLogoPath);
        } catch (err) {
          console.error("Error deleting old logo:", err);
        }
      }
    }
    
    // Update company with new logo URL
    const logoUrl = `/uploads/company-logos/${req.file.filename}`;
    const company = await storage.updateCompany(id, { logoUrl });
    
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    
    res.json(company);
  } catch (error) {
    console.error("Error uploading logo:", error);
    // Clean up uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Error cleaning up file:", err);
      }
    }
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: "File is too large. Maximum size is 3MB." });
      }
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: "Failed to upload logo" });
  }
});