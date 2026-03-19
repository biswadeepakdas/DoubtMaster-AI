import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { AppError } from './error.js';
import { getRedis } from '../db/redis.js';
import supabase from '../db/supabase.js';
import { logger } from '../utils/logger.js';

/**
 * Verify JWT token and attach user to request
 */
export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const token = authHeader.split(' ')[1];
    try {
      // SECURITY: Explicitly require HS256 to prevent algorithm confusion attacks
      const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return next(new AppError('Token expired', 401, 'TOKEN_EXPIRED'));
      }
      return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Check if user has an active subscription.
 * Revalidates plan from DB (cached in Redis for 5 minutes) instead of trusting JWT claim.
 */
export async function requirePro(req, res, next) {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const userId = req.user.id;
    const cacheKey = `user_plan:${userId}`;
    let currentPlan = null;

    // Try Redis cache first
    try {
      const redis = getRedis();
      const cached = await redis.get(cacheKey);
      if (cached) {
        currentPlan = cached;
      }
    } catch (err) {
      logger.warn(`Redis cache read failed for plan check: ${err.message}`);
    }

    // If not cached, query DB
    if (!currentPlan) {
      const { data: user, error } = await supabase
        .from('users')
        .select('plan')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
      }

      currentPlan = user.plan || 'free';

      // Cache in Redis for 5 minutes
      try {
        const redis = getRedis();
        await redis.set(cacheKey, currentPlan, 'EX', 300);
      } catch (err) {
        logger.warn(`Redis cache write failed for plan check: ${err.message}`);
      }
    }

    if (currentPlan === 'free') {
      return next(new AppError('Pro subscription required', 403, 'PRO_REQUIRED'));
    }

    // Update req.user.plan with the current value
    req.user.plan = currentPlan;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Check if user is a teacher/school admin
 */
export function requireTeacher(req, res, next) {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }
    if (req.user.role !== 'teacher' && req.user.role !== 'school_admin') {
      return next(new AppError('Teacher access required', 403, 'TEACHER_REQUIRED'));
    }
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Generate JWT tokens
 */
export function generateTokens(user) {
  // SECURITY: Explicitly set algorithm to prevent algorithm confusion attacks
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      plan: user.plan || 'free',
      role: user.role || 'student',
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn, algorithm: 'HS256' }
  );

  // SECURITY: Explicitly set algorithm to prevent algorithm confusion attacks
  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn, algorithm: 'HS256' }
  );

  return { accessToken, token: accessToken, refreshToken };
}
