import rateLimit from 'express-rate-limit';
import config from '../config/index.js';

/**
 * Rate limiter for question solving - different limits for free vs pro users
 */
export const solveLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: (req) => {
    try {
      if (!req.user) return 5; // Unauthenticated
      if (req.user.plan === 'pro' || req.user.plan === 'champion') return config.rateLimit?.proPerDay ?? 100;
      return config.rateLimit?.freePerDay ?? 5;
    } catch {
      return 5; // Safe fallback
    }
  },
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    error: 'Daily solve limit reached',
    code: 'RATE_LIMITED',
    upgrade: 'Upgrade to Pro for unlimited solves at just ₹49/month',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for NCERT solutions (unlimited for all users)
 */
export const ncertLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute (abuse prevention only)
  message: { error: 'Please slow down', code: 'RATE_LIMITED' },
});

/**
 * Auth rate limiter (prevent brute force)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts', code: 'RATE_LIMITED' },
});
