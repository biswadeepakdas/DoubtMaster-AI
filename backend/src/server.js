import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import { logger } from './utils/logger.js';
import { testConnection } from './db/supabase.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import questionRoutes from './routes/questions.js';
import solutionRoutes from './routes/solutions.js';
import userRoutes from './routes/user.js';
import subscriptionRoutes from './routes/subscriptions.js';
import schoolRoutes from './routes/school.js';
import searchRoutes from './routes/search.js';
import animationRoutes from './routes/animations.js';
import webhookRoutes from './routes/webhooks.js';

const app = express();

// Security
app.use(helmet());
// CORS: use CORS_ORIGIN env var, fallback to permissive in dev
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors({
  origin: corsOrigin === '*'
    ? true
    : corsOrigin
      ? corsOrigin.split(',').map(s => s.trim())
      : config.isDev
        ? ['http://localhost:3000', 'http://localhost:8081']
        : ['https://doubtmaster.ai', 'https://app.doubtmaster.ai'],
  credentials: true,
}));

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Webhooks need raw body (before JSON parser)
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/webhooks', webhookRoutes); // Backwards compatibility alias

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'doubtmaster-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API v1 routes (primary)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/solutions', solutionRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/school', schoolRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/animations', animationRoutes);

// Backwards compatibility: /api/* aliases to /api/v1/*
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/solutions', solutionRoutes);
app.use('/api/user', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/animations', animationRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(config.port, async () => {
  logger.info(`DoubtMaster API running on port ${config.port} (${config.nodeEnv})`);
  await testConnection();
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Trigger graceful shutdown — unhandled rejections indicate unpredictable state
  gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Trigger graceful shutdown — the process is in an undefined state
  gracefulShutdown('uncaughtException');
});

export default app;
