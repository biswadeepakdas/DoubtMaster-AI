import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

export function notFoundHandler(req, res) {
  // SECURITY: Do not echo the requested path back — prevents path enumeration and reflected content
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    code: 'NOT_FOUND',
  });
}

export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  if (statusCode >= 500) {
    logger.error('Server error:', { error: err.message, stack: err.stack, path: req.path });
  }

  res.status(statusCode).json({
    error: message,
    message: message,
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
