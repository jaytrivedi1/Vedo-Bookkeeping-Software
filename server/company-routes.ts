import express, { Request, Response } from "express";
import { storage } from "./storage";
import { insertCompanySchema } from "@shared/schema";
import { z } from "zod";

export const companyRouter = express.Router();

// Get all companies
companyRouter.get("/", async (req: Request, res: Response) => {
  try {
    const companies = await storage.getCompanies();
    res.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ message: "Failed to fetch companies" });
  }
});

// Get default company
companyRouter.get("/default", async (req: Request, res: Response) => {
  try {
    const company = await storage.getDefaultCompany();
    if (!company) {
      return res.status(404).json({ message: "No default company found" });
    }
    res.json(company);
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
    const companyData = insertCompanySchema.parse(req.body);
    const company = await storage.createCompany(companyData);
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
    const companyData = insertCompanySchema.partial().parse(req.body);
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