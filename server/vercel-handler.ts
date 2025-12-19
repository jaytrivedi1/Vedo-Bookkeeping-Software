import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";

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
    console.log('Starting route registration...');
    console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);
    console.log('POSTGRES_URL set:', !!process.env.POSTGRES_URL);
    console.log('SESSION_SECRET set:', !!process.env.SESSION_SECRET);

    // registerRoutes sets up auth and all API routes
    await registerRoutes(app);
    isInitialized = true;
    console.log('Route registration complete');
  })();

  return initPromise;
}

// Export handler for Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('Handler called:', req.method, req.url);
    await initializeApp();
    console.log('App initialized successfully');
  } catch (error) {
    console.error('Initialization error:', error);
    res.status(500).json({
      error: 'Failed to initialize app',
      message: error instanceof Error ? error.message : String(error)
    });
    return;
  }

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
