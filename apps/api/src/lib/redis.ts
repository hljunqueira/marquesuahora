import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  }
});

redis.on('error', (err) => {
  console.warn('[Redis] Aviso de conexão:', err.message);
});
