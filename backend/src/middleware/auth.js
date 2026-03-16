import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { AppError } from './error.js';

/**
 * Verify JWT token and attach user to request
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired', 401, 'TOKEN_EXPIRED');
    }
    throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }
}

/**
 * Check if user has an active subscription
 */
export function requirePro(req, res, next) {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }
  if (req.user.plan === 'free') {
    throw new AppError('Pro subscription required', 403, 'PRO_REQUIRED');
  }
  next();
}

/**
 * Check if user is a teacher/school admin
 */
export function requireTeacher(req, res, next) {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }
  if (req.user.role !== 'teacher' && req.user.role !== 'school_admin') {
    throw new AppError('Teacher access required', 403, 'TEACHER_REQUIRED');
  }
  next();
}

/**
 * Generate JWT tokens
 */
export function generateTokens(user) {
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      plan: user.plan || 'free',
      role: user.role || 'student',
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
}
