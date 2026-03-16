import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { validate, schemas } from '../middleware/validate.js';
import { authenticate, generateTokens } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { AppError } from '../middleware/error.js';
import { logger } from '../utils/logger.js';

const router = Router();

// In-memory store for demo (replace with Supabase/Prisma in production)
const users = new Map();
const otpStore = new Map();

/**
 * POST /api/auth/register
 * Register a new user with phone OTP or email
 */
router.post('/register', authLimiter, validate(schemas.register), async (req, res, next) => {
  try {
    const { phone, email, name, class: grade, board, language } = req.validated;
    const identifier = phone || email;

    if (users.has(identifier)) {
      throw new AppError('User already exists', 409, 'USER_EXISTS');
    }

    const user = {
      id: uuidv4(),
      phone: phone || null,
      email: email || null,
      name,
      class: grade,
      board,
      language,
      plan: 'free',
      role: 'student',
      createdAt: new Date().toISOString(),
      solveCount: 0,
      streak: 0,
    };

    users.set(identifier, user);

    if (phone) {
      // Generate OTP (in production: send via SMS gateway like MSG91)
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
      logger.info(`OTP for ${phone}: ${otp}`); // Dev only
      return res.status(201).json({
        message: 'OTP sent successfully',
        requiresVerification: true,
      });
    }

    // Email registration - generate tokens directly
    const tokens = generateTokens(user);
    res.status(201).json({ user: sanitizeUser(user), ...tokens });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/verify-otp
 * Verify phone OTP and return JWT
 */
router.post('/verify-otp', authLimiter, async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      throw new AppError('Phone and OTP are required', 400, 'VALIDATION_ERROR');
    }

    const stored = otpStore.get(phone);
    if (!stored || stored.otp !== otp) {
      throw new AppError('Invalid OTP', 401, 'INVALID_OTP');
    }
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(phone);
      throw new AppError('OTP expired', 401, 'OTP_EXPIRED');
    }

    otpStore.delete(phone);
    const user = users.get(phone);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const tokens = generateTokens(user);
    res.json({ user: sanitizeUser(user), ...tokens });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login with email/phone + generate new OTP or password
 */
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { phone, email } = req.body;
    const identifier = phone || email;
    if (!identifier) {
      throw new AppError('Phone or email required', 400, 'VALIDATION_ERROR');
    }

    const user = users.get(identifier);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (phone) {
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
      logger.info(`OTP for ${phone}: ${otp}`);
      return res.json({ message: 'OTP sent', requiresVerification: true });
    }

    // For email login, generate tokens directly (add password in production)
    const tokens = generateTokens(user);
    res.json({ user: sanitizeUser(user), ...tokens });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError('Refresh token required', 400, 'VALIDATION_ERROR');
    }

    // Verify refresh token (simplified - use proper validation in production)
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(refreshToken, (await import('../config/index.js')).default.jwt.secret);

    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
    }

    // Find user and generate new tokens
    let user = null;
    for (const [, u] of users) {
      if (u.id === decoded.id) { user = u; break; }
    }
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    const tokens = generateTokens(user);
    res.json(tokens);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', authenticate, (req, res) => {
  const user = [...users.values()].find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: sanitizeUser(user) });
});

function sanitizeUser(user) {
  const { ...safe } = user;
  return safe;
}

export default router;
