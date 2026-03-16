import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { validate, schemas } from '../middleware/validate.js';
import { authenticate, generateTokens } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { AppError } from '../middleware/error.js';
import { logger } from '../utils/logger.js';
import supabase from '../db/supabase.js';

const router = Router();

/**
 * POST /api/auth/register
 */
router.post('/register', authLimiter, validate(schemas.register), async (req, res, next) => {
  try {
    const { phone, email, name, class: grade, board, language } = req.validated;

    // Check if user exists
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

    if (error) throw new AppError(`Registration failed: ${error.message}`, 500, 'DB_ERROR');

    if (phone) {
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      await supabase.from('otp_store').upsert({
        phone,
        otp,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
      logger.info(`OTP for ${phone}: ${otp}`);
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

    const { data: stored } = await supabase.from('otp_store')
      .select('otp, expires_at').eq('phone', phone).maybeSingle();

    if (!stored || stored.otp !== otp) throw new AppError('Invalid OTP', 401, 'INVALID_OTP');
    if (new Date(stored.expires_at) < new Date()) {
      await supabase.from('otp_store').delete().eq('phone', phone);
      throw new AppError('OTP expired', 401, 'OTP_EXPIRED');
    }

    await supabase.from('otp_store').delete().eq('phone', phone);

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
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      await supabase.from('otp_store').upsert({
        phone,
        otp,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
      logger.info(`OTP for ${phone}: ${otp}`);
      return res.json({ message: 'OTP sent', requiresVerification: true });
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
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh token required', 400, 'VALIDATION_ERROR');

    const jwt = await import('jsonwebtoken');
    const config = (await import('../config/index.js')).default;
    const decoded = jwt.default.verify(refreshToken, config.jwt.secret);

    if (decoded.type !== 'refresh') throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');

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
