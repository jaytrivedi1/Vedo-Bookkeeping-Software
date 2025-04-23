import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SchemaUser } from "@shared/schema";
import createMemoryStore from "memorystore";

declare global {
  namespace Express {
    // Extend Express.User with our schema's User type
    interface User extends SchemaUser {}
  }
}

// Create MemoryStore for sessions
const MemoryStore = createMemoryStore(session);

export function setupAuth(app: Express): void {
  // Configure session
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'finledger-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === 'production'
    }
  };

  // Set up trust proxy if in production
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Initialize session and passport
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport Local Strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Find user by username
        const user = await storage.getUserByUsername(username);
        
        // If user not found or password doesn't match
        if (!user || !(await storage.validatePassword(user.password, password))) {
          return done(null, false, { message: 'Incorrect username or password' });
        }
        
        // Update last login time
        await storage.updateUserLastLogin(user.id);
        
        // Return user
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Serialize user to session
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register authentication routes
  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email already exists
      if (req.body.email) {
        const existingEmail = await storage.getUserByEmail(req.body.email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }

      // Create user
      const user = await storage.createUser(req.body);

      // If this is the first user, assign them to all companies
      const companies = await storage.getCompanies();
      if (companies.length > 0) {
        for (const company of companies) {
          await storage.assignUserToCompany({
            userId: user.id,
            companyId: company.id,
            role: 'admin' // First user gets admin role
          });
        }
      }

      // Log in the newly created user
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          firstName: user.firstName,
          lastName: user.lastName,
        });
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Registration failed", error: error.message });
    }
  });

  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: SchemaUser | false, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Authentication failed" });
      
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.status(200).json({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          firstName: user.firstName,
          lastName: user.lastName,
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed", error: err.message });
      }
      return res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user;
    return res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  });

  // Middleware to check if user is authenticated
  app.use("/api/auth-required", (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  });
}

// Middleware to ensure user is authenticated for specific routes
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// Middleware to ensure user has admin role
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  next();
}

// Middleware to ensure user has specific permission for a role
export function requirePermission(permissionName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      // Get user's role
      const userRole = req.user.role;
      
      // Get permissions for the role
      const rolePermissions = await storage.getRolePermissions(userRole);
      
      // Get the permission ID for the required permission
      const permission = await storage.getPermissionByName(permissionName);
      
      if (!permission) {
        console.error(`Permission "${permissionName}" not found in the system`);
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Check if the role has the required permission
      const hasPermission = rolePermissions.some(rp => rp.permissionId === permission.id);
      
      if (!hasPermission) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      next();
    } catch (error) {
      console.error("Error checking permissions:", error);
      return res.status(500).json({ message: "Error checking permissions" });
    }
  };
}