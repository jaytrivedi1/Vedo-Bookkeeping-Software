import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { storage } from "./storage";
import { User as SchemaUser, usersSchema } from "@shared/schema";
import { pool, db } from "./db";
import { eq } from "drizzle-orm";
import {
  loginRateLimiter,
  registrationRateLimiter,
  passwordResetRateLimiter,
  emailVerificationRateLimiter
} from "./middleware/rate-limiter";
import {
  createVerificationToken,
  sendVerificationEmail,
  verifyEmailToken,
  resendVerificationEmail
} from "./services/email-verification";
import {
  requestPasswordReset,
  validateResetToken,
  resetPassword,
  validatePasswordStrength
} from "./services/password-reset";

declare global {
  namespace Express {
    // Extend Express.User with our schema's User type
    interface User extends SchemaUser {}
  }
}

// Account lockout settings
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

// Create PostgreSQL session store
const PgSession = connectPgSimple(session);

/**
 * Check if user account is locked
 */
async function isAccountLocked(user: SchemaUser): Promise<boolean> {
  if (!user.lockedUntil) return false;
  if (new Date() > user.lockedUntil) {
    // Lockout has expired, reset the counter
    await db.update(usersSchema)
      .set({ failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(usersSchema.id, user.id));
    return false;
  }
  return true;
}

/**
 * Record failed login attempt
 */
async function recordFailedLogin(userId: number, currentAttempts: number): Promise<{
  locked: boolean;
  attemptsRemaining: number;
}> {
  const newAttempts = currentAttempts + 1;
  const locked = newAttempts >= MAX_FAILED_ATTEMPTS;

  const lockedUntil = locked
    ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
    : null;

  await db.update(usersSchema)
    .set({
      failedLoginAttempts: newAttempts,
      lockedUntil
    })
    .where(eq(usersSchema.id, userId));

  return {
    locked,
    attemptsRemaining: Math.max(0, MAX_FAILED_ATTEMPTS - newAttempts)
  };
}

/**
 * Reset failed login attempts on successful login
 */
async function resetFailedAttempts(userId: number): Promise<void> {
  await db.update(usersSchema)
    .set({ failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(usersSchema.id, userId));
}

export function setupAuth(app: Express): void {
  // Configure session with PostgreSQL store
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'vedo-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new PgSession({
      pool: pool as any, // Use the existing database pool
      tableName: 'session', // Table name for sessions
      createTableIfMissing: true // Automatically create session table
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours default
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

  // Configure Passport Local Strategy - supports both email and username login
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Try to find user by email first (if input looks like an email), then by username
        let user = null;
        if (username.includes('@')) {
          user = await storage.getUserByEmail(username);
        }
        if (!user) {
          user = await storage.getUserByUsername(username);
        }

        // If user not found
        if (!user) {
          return done(null, false, { message: 'Incorrect email or password' });
        }

        // Check if account is locked
        if (await isAccountLocked(user)) {
          const remainingMinutes = Math.ceil(
            (user.lockedUntil!.getTime() - Date.now()) / 60000
          );
          return done(null, false, {
            message: `Account is locked. Please try again in ${remainingMinutes} minutes.`
          });
        }

        // Validate password
        if (!(await storage.validatePassword(user.password, password))) {
          // Record failed attempt
          const result = await recordFailedLogin(user.id, user.failedLoginAttempts || 0);

          if (result.locked) {
            return done(null, false, {
              message: `Too many failed attempts. Account is locked for ${LOCKOUT_DURATION_MINUTES} minutes.`
            });
          }

          return done(null, false, {
            message: `Incorrect email or password. ${result.attemptsRemaining} attempts remaining.`
          });
        }

        // Check if email is verified
        if (!user.emailVerified) {
          return done(null, false, {
            message: 'Please verify your email address before logging in. Check your inbox for the verification link.'
          });
        }

        // Reset failed attempts on successful login
        await resetFailedAttempts(user.id);

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

  // Register authentication routes with rate limiting
  app.post("/api/register", registrationRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, email, password, firstName, lastName } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Validate email format
      if (!email.includes('@')) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          message: "Password does not meet requirements",
          errors: passwordValidation.errors
        });
      }

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      // Check if username already exists (username defaults to email if not provided)
      const usernameToUse = username || email;
      const existingUser = await storage.getUserByUsername(usernameToUse);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Create user with safe defaults (no auto-assignment to companies)
      const user = await storage.createUser({
        username: usernameToUse,
        email,
        password,
        firstName: firstName || null,
        lastName: lastName || null,
        role: 'admin', // New users get admin role for their own companies
        isActive: true
      });

      // Create verification token and send email
      const token = await createVerificationToken(user.id);
      const emailResult = await sendVerificationEmail(email, token, firstName);

      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
        // Still allow registration but warn about email
      }

      // Return success without logging in (user must verify email first)
      return res.status(201).json({
        message: "Registration successful! Please check your email to verify your account.",
        requiresVerification: true
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Registration failed", error: error.message });
    }
  });

  // Login with rate limiting
  app.post("/api/login", loginRateLimiter, (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: SchemaUser | false, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Authentication failed" });

      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);

        // Handle "Remember me" functionality
        if (req.body.rememberMe) {
          // Extend session duration to 30 days
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        } else {
          // Default session duration (24 hours)
          req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
        }

        return res.status(200).json({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified
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
      emailVerified: user.emailVerified
    });
  });

  // Email verification endpoint
  app.get("/api/verify-email", emailVerificationRateLimiter, async (req: Request, res: Response) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Verification token is required" });
      }

      const result = await verifyEmailToken(token);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.status(200).json({
        message: "Email verified successfully! You can now log in.",
        verified: true
      });
    } catch (error: any) {
      console.error("Email verification error:", error);
      return res.status(500).json({ message: "Verification failed" });
    }
  });

  // Resend verification email
  app.post("/api/resend-verification", emailVerificationRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const result = await resendVerificationEmail(email);

      // Always return success to prevent email enumeration
      return res.status(200).json({
        message: "If an account exists with this email, a verification link has been sent."
      });
    } catch (error: any) {
      console.error("Resend verification error:", error);
      return res.status(500).json({ message: "Failed to resend verification email" });
    }
  });

  // Forgot password - request reset
  app.post("/api/forgot-password", passwordResetRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      await requestPasswordReset(email);

      // Always return success to prevent email enumeration
      return res.status(200).json({
        message: "If an account exists with this email, a password reset link has been sent."
      });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      return res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Validate reset token (for checking if token is valid before showing reset form)
  app.get("/api/validate-reset-token", async (req: Request, res: Response) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ valid: false, message: "Token is required" });
      }

      const result = await validateResetToken(token);

      return res.status(200).json({
        valid: result.valid,
        message: result.error
      });
    } catch (error: any) {
      console.error("Validate reset token error:", error);
      return res.status(500).json({ valid: false, message: "Validation failed" });
    }
  });

  // Reset password with token
  app.post("/api/reset-password", passwordResetRateLimiter, async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          message: "Password does not meet requirements",
          errors: passwordValidation.errors
        });
      }

      const result = await resetPassword(token, password);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.status(200).json({
        message: "Password reset successfully! You can now log in with your new password."
      });
    } catch (error: any) {
      console.error("Reset password error:", error);
      return res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Validate password strength endpoint (for client-side validation)
  app.post("/api/validate-password", (req: Request, res: Response) => {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const result = validatePasswordStrength(password);
    return res.status(200).json(result);
  });

  // Change password endpoint (for authenticated users)
  app.post("/api/user/change-password", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          message: "New password does not meet requirements",
          errors: passwordValidation.errors
        });
      }

      // Get the current user from storage
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate current password
      const isValidPassword = await storage.validatePassword(user.password, currentPassword);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await storage.hashPassword(newPassword);

      // Update user password
      await storage.updateUser(user.id, { password: hashedPassword });

      return res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      return res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Update user profile endpoint
  app.patch("/api/user/profile", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { username, email, firstName, lastName } = req.body;
      const updates: Partial<SchemaUser> = {};

      // Only update fields that are provided
      if (username !== undefined) {
        if (!username || username.trim().length === 0) {
          return res.status(400).json({ message: "Username cannot be empty" });
        }

        // Check if username is already taken by another user
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== req.user.id) {
          return res.status(409).json({ message: "Username is already taken" });
        }
        updates.username = username;
      }

      if (email !== undefined) {
        if (email && email.includes('@')) {
          updates.email = email;
        } else if (email) {
          return res.status(400).json({ message: "Invalid email format" });
        }
      }

      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;

      // Update user
      const updatedUser = await storage.updateUser(req.user.id, updates);

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({ message: "Failed to update profile" });
    }
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
