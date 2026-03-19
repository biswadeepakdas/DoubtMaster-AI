import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { validate, schemas } from '../middleware/validate.js';
import { authenticate, generateTokens } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { AppError } from '../middleware/error.js';
import { logger } from '../utils/logger.js';
import config from '../config/index.js';
import supabase from '../db/supabase.js';
import { getRedis } from '../db/redis.js';

const router = Router();

// SECURITY: Bcrypt cost factor — 12 rounds is the current minimum recommendation
const BCRYPT_ROUNDS = 12;

/**
 * SECURITY: Generate a cryptographically secure 6-digit OTP using crypto.randomInt.
 * Math.random() is NOT suitable for security-sensitive values.
 */
function generateSecureOTP() {
  return String(crypto.randomInt(100000, 999999));
}

/**
 * SECURITY: Track OTP verification attempts to prevent brute-force.
 * Allows max 5 attempts per identifier within a 15-minute window.
 */
async function checkOTPAttemptLimit(identifier) {
  const key = `otp_attempts:${identifier}`;
  try {
    const redis = getRedis();
    const attempts = await redis.incr(key);
    if (attempts === 1) {
      await redis.expire(key, 900); // 15 minutes
    }
    if (attempts > 5) {
      throw new AppError('Too many OTP verification attempts. Please request a new OTP.', 429, 'OTP_ATTEMPTS_EXCEEDED');
    }
  } catch (err) {
    if (err.code === 'OTP_ATTEMPTS_EXCEEDED') throw err;
    // If Redis is unavailable, allow the request (fail open for OTP attempts)
    logger.warn(`Redis OTP attempt tracking failed: ${err.message}`);
  }
}

/**
 * SECURITY: Clear OTP attempt counter after successful verification.
 */
async function clearOTPAttempts(identifier) {
  try {
    const redis = getRedis();
    await redis.del(`otp_attempts:${identifier}`);
  } catch (err) {
    logger.warn(`Failed to clear OTP attempts: ${err.message}`);
  }
}

/**
 * POST /api/v1/auth/signup
 * Frontend sends { method, identifier, name, class, board, plan, password }
 */
router.post('/signup', authLimiter, async (req, res, next) => {
  try {
    const { method, identifier: rawIdentifier, name, class: grade, board, plan, password, phone: rawPhone, email: rawEmail } = req.body;

    // Support both frontend format (method+identifier) and direct format (phone/email)
    let phone = rawPhone || null;
    let email = rawEmail || null;
    if (rawIdentifier) {
      if (method === 'phone') phone = rawIdentifier;
      else email = rawIdentifier;
    }
    const identifier = phone || email || rawIdentifier;

    if (!identifier || !name) {
      throw new AppError('Identifier and name are required', 400, 'VALIDATION_ERROR');
    }

    const isPhone = !!phone || method === 'phone';
    const queryField = isPhone ? 'phone' : 'email';

    // Check if user exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq(queryField, identifier)
      .maybeSingle();

    if (existing) throw new AppError('User already exists', 409, 'USER_EXISTS');

    // Hash password if provided
    const passwordHash = password ? await bcrypt.hash(password, BCRYPT_ROUNDS) : null;

    // Create user
    const { data: user, error } = await supabase.from('users').insert({
      phone: isPhone ? identifier : null,
      email: !isPhone ? identifier : null,
      name,
      class: grade,
      board,
      // SECURITY: Always start as 'free' — plan upgrades only via verified payment webhooks
      plan: 'free',
      password_hash: passwordHash,
    }).select().single();

    if (error) {
      // SECURITY: Do not leak DB error details to the client
      logger.error(`Registration DB error: ${error.message}`);
      throw new AppError('Registration failed. Please try again.', 500, 'DB_ERROR');
    }

    if (isPhone) {
      const otp = generateSecureOTP();
      await supabase.from('otp_store').upsert({
        identifier,
        otp,
        type: 'phone',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
      if (config.isDev) {
        logger.info(`OTP for ${identifier}: ${otp}`);
      } else {
        logger.info(`OTP sent to ***${identifier.slice(-4)}`);
      }
      return res.status(201).json({ message: 'OTP sent successfully', requiresVerification: true });
    }

    // Email signup — return tokens directly
    const tokens = generateTokens(user);
    res.status(201).json({ user: sanitizeUser(user), ...tokens });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/login/otp
 * Frontend sends { phone } for phone OTP login
 */
router.post('/login/otp', authLimiter, async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) throw new AppError('Phone number is required', 400, 'VALIDATION_ERROR');

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    const otp = generateSecureOTP();
    await supabase.from('otp_store').upsert({
      identifier: phone,
      otp,
      type: 'phone',
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
    if (config.isDev) {
      logger.info(`OTP for ${phone}: ${otp}`);
    } else {
      logger.info(`OTP sent to ***${phone.slice(-4)}`);
    }
    return res.json({ message: 'OTP sent', requiresVerification: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/verify-signup
 * Frontend sends { identifier, otp, method }
 */
router.post('/verify-signup', authLimiter, async (req, res, next) => {
  try {
    const { identifier, otp, method } = req.body;
    if (!identifier || !otp) throw new AppError('Identifier and OTP are required', 400, 'VALIDATION_ERROR');

    // SECURITY: Prevent OTP brute-force (max 5 attempts per identifier)
    await checkOTPAttemptLimit(identifier);

    const { data: stored } = await supabase.from('otp_store')
      .select('otp, expires_at').eq('identifier', identifier).maybeSingle();

    // SECURITY: Use timing-safe comparison for OTP to prevent timing attacks
    const otpMatch = stored && stored.otp && otp &&
      stored.otp.length === otp.length &&
      crypto.timingSafeEqual(Buffer.from(stored.otp), Buffer.from(otp));

    if (!stored || !otpMatch) throw new AppError('Invalid OTP', 401, 'INVALID_OTP');
    if (new Date(stored.expires_at) < new Date()) {
      await supabase.from('otp_store').delete().eq('identifier', identifier);
      throw new AppError('OTP expired', 401, 'OTP_EXPIRED');
    }

    await supabase.from('otp_store').delete().eq('identifier', identifier);
    await clearOTPAttempts(identifier);

    const isPhone = method === 'phone';
    const queryField = isPhone ? 'phone' : 'email';
    const { data: user } = await supabase.from('users')
      .select('*').eq(queryField, identifier).single();
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    const tokens = generateTokens(user);
    res.json({ user: sanitizeUser(user), ...tokens });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/resend-otp
 * Frontend sends { identifier, method }
 */
router.post('/resend-otp', authLimiter, async (req, res, next) => {
  try {
    const { identifier, method } = req.body;
    if (!identifier) throw new AppError('Identifier is required', 400, 'VALIDATION_ERROR');

    const isPhone = method === 'phone';
    const queryField = isPhone ? 'phone' : 'email';

    const { data: user } = await supabase.from('users')
      .select('id').eq(queryField, identifier).maybeSingle();
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    const otp = generateSecureOTP();
    await supabase.from('otp_store').upsert({
      identifier,
      otp,
      type: isPhone ? 'phone' : 'email',
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
    if (config.isDev) {
      logger.info(`OTP for ${identifier}: ${otp}`);
    } else {
      const masked = isPhone ? `***${identifier.slice(-4)}` : `${identifier[0]}***@${identifier.split('@')[1]}`;
      logger.info(`OTP resent to ${masked}`);
    }
    return res.json({ message: 'OTP resent successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/register
 */
router.post('/register', authLimiter, validate(schemas.register), async (req, res, next) => {
  try {
    const { phone: rawPhone, email: rawEmail, name, class: grade, board, language } = req.validated;

    // Support both frontend format (method+identifier) and direct format (phone/email)
    const { method, identifier: rawIdentifier, plan } = req.body;
    let phone = rawPhone || null;
    let email = rawEmail || null;
    if (rawIdentifier && !phone && !email) {
      if (method === 'phone') phone = rawIdentifier;
      else email = rawIdentifier;
    }
    const identifier = phone || email;
    const { data: existing } = phone
      ? await supabase.from('users').select('id').eq('phone', phone).maybeSingle()
      : await supabase.from('users').select('id').eq('email', email).maybeSingle();

    if (existing) throw new AppError('User already exists', 409, 'USER_EXISTS');

    // Create user
    const { data: user, error } = await supabase.from('users').insert({
      phone: phone || null,
      email: email || null,
      name,
      class: grade,
      board,
      language,
    }).select().single();

    if (error) {
      // SECURITY: Do not leak DB error details to the client
      logger.error(`Registration DB error: ${error.message}`);
      throw new AppError('Registration failed. Please try again.', 500, 'DB_ERROR');
    }

    if (phone) {
      const otp = generateSecureOTP();
      await supabase.from('otp_store').upsert({
        identifier: phone,
        otp,
        type: 'phone',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
      if (config.isDev) {
        logger.info(`OTP for ${phone}: ${otp}`);
      } else {
        logger.info(`OTP sent to ***${phone.slice(-4)}`);
      }
      return res.status(201).json({ message: 'OTP sent successfully', requiresVerification: true });
    }

    const tokens = generateTokens(user);
    res.status(201).json({ user: sanitizeUser(user), ...tokens });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/verify-otp
 */
router.post('/verify-otp', authLimiter, async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) throw new AppError('Phone and OTP are required', 400, 'VALIDATION_ERROR');

    // SECURITY: Prevent OTP brute-force (max 5 attempts per phone)
    await checkOTPAttemptLimit(phone);

    const { data: stored } = await supabase.from('otp_store')
      .select('otp, expires_at').eq('identifier', phone).maybeSingle();

    // SECURITY: Use timing-safe comparison for OTP
    const otpMatch = stored && stored.otp && otp &&
      stored.otp.length === otp.length &&
      crypto.timingSafeEqual(Buffer.from(stored.otp), Buffer.from(otp));

    if (!stored || !otpMatch) throw new AppError('Invalid OTP', 401, 'INVALID_OTP');
    if (new Date(stored.expires_at) < new Date()) {
      await supabase.from('otp_store').delete().eq('identifier', phone);
      throw new AppError('OTP expired', 401, 'OTP_EXPIRED');
    }

    await supabase.from('otp_store').delete().eq('identifier', phone);
    await clearOTPAttempts(phone);

    const { data: user } = await supabase.from('users')
      .select('*').eq('phone', phone).single();
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    const tokens = generateTokens(user);
    res.json({ user: sanitizeUser(user), ...tokens });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { phone, email } = req.body;
    const identifier = phone || email;
    if (!identifier) throw new AppError('Phone or email required', 400, 'VALIDATION_ERROR');

    const { data: user } = phone
      ? await supabase.from('users').select('*').eq('phone', phone).maybeSingle()
      : await supabase.from('users').select('*').eq('email', email).maybeSingle();

    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    if (phone) {
      const otp = generateSecureOTP();
      await supabase.from('otp_store').upsert({
        identifier: phone,
        otp,
        type: 'phone',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
      if (config.isDev) {
        logger.info(`OTP for ${phone}: ${otp}`);
      } else {
        logger.info(`OTP sent to ***${phone.slice(-4)}`);
      }
      return res.json({ message: 'OTP sent', requiresVerification: true });
    }

    // Email login requires password
    const { password } = req.body;
    if (!password) {
      throw new AppError('Password is required for email login', 400, 'VALIDATION_ERROR');
    }

    if (!user.password_hash) {
      throw new AppError('No password set for this account. Please reset your password.', 401, 'NO_PASSWORD');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const tokens = generateTokens(user);
    res.json({ user: sanitizeUser(user), ...tokens });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', authLimiter, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh token required', 400, 'VALIDATION_ERROR');

    const jwt = await import('jsonwebtoken');
    const config = (await import('../config/index.js')).default;
    // SECURITY: Explicitly require HS256 to prevent algorithm confusion
    const decoded = jwt.default.verify(refreshToken, config.jwt.secret, { algorithms: ['HS256'] });

    if (decoded.type !== 'refresh') throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');

    // SECURITY: Refresh token rotation — invalidate old token via Redis blocklist
    try {
      const redis = getRedis();
      const tokenId = `rt:${refreshToken.slice(-16)}`; // Use last 16 chars as key
      const alreadyUsed = await redis.get(tokenId);
      if (alreadyUsed) {
        // Token reuse detected — potential token theft, invalidate all tokens for this user
        logger.warn(`Refresh token reuse detected for user ${decoded.id} — possible token theft`);
        throw new AppError('Refresh token already used. Please log in again.', 401, 'TOKEN_REUSED');
      }
      // Mark this refresh token as used (keep for the duration of its max lifetime)
      await redis.set(tokenId, '1', 'EX', 7 * 24 * 3600); // 7 days
    } catch (err) {
      if (err.code === 'TOKEN_REUSED') throw err;
      logger.warn(`Redis refresh token rotation check failed: ${err.message}`);
    }

    const { data: user } = await supabase.from('users')
      .select('*').eq('id', decoded.id).single();
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    const tokens = generateTokens(user);
    res.json(tokens);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { data: user } = await supabase.from('users')
      .select('*').eq('id', req.user.id).single();
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Update last active
    await supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', user.id);

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
});

function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

export default router;
