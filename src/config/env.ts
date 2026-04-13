import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number.parseInt(process.env.PORT || '5000', 10),
  mongoUri: requireEnv('MONGODB_URI'),
  accessTokenSecret: requireEnv('JWT_ACCESS_SECRET'),
  refreshTokenSecret: requireEnv('JWT_REFRESH_SECRET'),
  accessTokenTtl: process.env.JWT_ACCESS_EXPIRES || '15m',
  refreshTokenTtl: process.env.JWT_REFRESH_EXPIRES || '7d',
  redisUrl: process.env.REDIS_URL,
  cacheTtlSeconds: Number.parseInt(process.env.CACHE_TTL_SECONDS || '60', 10),
};
