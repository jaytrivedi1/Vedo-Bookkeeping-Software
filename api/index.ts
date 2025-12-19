import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";

// Create Express app for Vercel serverless
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Trust proxy for secure cookies in production
app.set('trust proxy', 1);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("Error:", err);
  res.status(status).json({ message });
});

// Initialize routes
let isInitialized = false;
let initPromise: Promise<void> | null = null;

async function initializeApp() {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // registerRoutes sets up auth and all API routes
    // It also creates an HTTP server but we don't need it for Vercel
    await registerRoutes(app);
    isInitialized = true;
  })();

  return initPromise;
}

// Export handler for Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
  await initializeApp();

  // Create a promise that resolves when Express finishes handling the request
  return new Promise<void>((resolve, reject) => {
    // Express app is a function that can be called directly
    app(req as any, res as any, (err?: any) => {
      if (err) {
        console.error('Express error:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
