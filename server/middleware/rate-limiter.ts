import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitStore {
  [key: string]: RateLimitEntry;
}

// In-memory store for rate limiting
// In production with multiple instances, use Redis or similar
const stores: { [name: string]: RateLimitStore } = {};

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const storeName in stores) {
    const store = stores[storeName];
    for (const key in store) {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    }
  }
}, 60000); // Cleanup every minute

interface RateLimitOptions {
  name: string;           // Unique name for this limiter
  windowMs: number;       // Time window in milliseconds
  maxRequests: number;    // Maximum requests per window
  message?: string;       // Error message when rate limited
  keyGenerator?: (req: Request) => string;  // Function to generate key (default: IP)
  skipSuccessfulRequests?: boolean;  // Only count failed requests
}

/**
 * Create a rate limiter middleware
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    name,
    windowMs,
    maxRequests,
    message = 'Too many requests. Please try again later.',
    keyGenerator = (req) => getClientIP(req),
    skipSuccessfulRequests = false
  } = options;

  // Initialize store for this limiter
  if (!stores[name]) {
    stores[name] = {};
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const store = stores[name];
    const key = keyGenerator(req);
    const now = Date.now();

    // Get or create entry
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs
      };
    }

    const entry = store[key];

    // Check if over limit
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        message,
        retryAfter
      });
    }

    // Increment count
    entry.count++;

    // If skipSuccessfulRequests is true, we need to decrement on success
    if (skipSuccessfulRequests) {
      const originalEnd = res.end;
      res.end = function(...args: any[]) {
        if (res.statusCode < 400) {
          entry.count = Math.max(0, entry.count - 1);
        }
        return originalEnd.apply(res, args);
      };
    }

    next();
  };
}

/**
 * Get client IP address (handles proxies)
 */
function getClientIP(req: Request): string {
  // Check for forwarded headers (when behind proxy)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string'
      ? forwarded.split(',')
      : forwarded[0]?.split(',');
    return ips?.[0]?.trim() || req.ip || 'unknown';
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

// Pre-configured rate limiters

/**
 * Login rate limiter - 10 attempts per 15 minutes per IP
 */
export const loginRateLimiter = createRateLimiter({
  name: 'login',
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  message: 'Too many login attempts. Please try again in 15 minutes.',
  skipSuccessfulRequests: true
});

/**
 * Registration rate limiter - 5 attempts per hour per IP
 */
export const registrationRateLimiter = createRateLimiter({
  name: 'registration',
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
  message: 'Too many registration attempts. Please try again later.'
});

/**
 * Password reset rate limiter - 3 attempts per hour per IP
 */
export const passwordResetRateLimiter = createRateLimiter({
  name: 'passwordReset',
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  message: 'Too many password reset attempts. Please try again later.'
});

/**
 * Email verification rate limiter - 5 attempts per hour per IP
 */
export const emailVerificationRateLimiter = createRateLimiter({
  name: 'emailVerification',
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
  message: 'Too many verification attempts. Please try again later.'
});
