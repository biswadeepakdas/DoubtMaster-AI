import Redis from 'ioredis';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

let redis = null;
let reconnectTimer = null;

export function getRedis() {
  if (!redis) {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 2000);
        logger.warn(`Redis retry #${times}, next attempt in ${delay}ms`);
        return delay;
      },
      lazyConnect: true,
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
      stopReconnectMonitor();
    });
    redis.on('ready', () => logger.info('Redis ready'));
    redis.on('close', () => {
      logger.warn('Redis connection closed');
      startReconnectMonitor();
    });
    redis.on('reconnecting', (ms) => logger.info(`Redis reconnecting in ${ms}ms`));
    redis.on('error', (err) => logger.error(`Redis error: ${err.message}`));

    redis.connect().catch((err) => {
      logger.error(`Redis initial connection failed: ${err.message}`);
      startReconnectMonitor();
    });
  }

  // Guard against returning a client that is not yet usable.
  // If the client is in 'wait' or 'end' state, attempt to reconnect.
  if (redis.status === 'wait' || redis.status === 'end') {
    logger.warn(`Redis client in "${redis.status}" state – attempting reconnect`);
    redis.connect().catch((err) => {
      logger.error(`Redis reconnect failed: ${err.message}`);
      startReconnectMonitor();
    });
  }

  return redis;
}

function startReconnectMonitor() {
  if (reconnectTimer) return;
  reconnectTimer = setInterval(() => {
    if (redis && redis.status !== 'ready' && redis.status !== 'connect') {
      logger.warn(`Redis still disconnected (status: ${redis.status}). Waiting for reconnect...`);
    }
  }, 30000); // Log every 30 seconds while disconnected
}

function stopReconnectMonitor() {
  if (reconnectTimer) {
    clearInterval(reconnectTimer);
    reconnectTimer = null;
  }
}

export default getRedis;
