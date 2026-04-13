import { createClient } from 'redis';
import { env } from '../config/env';

type CacheEntry = { value: string; expiresAt: number };
type RedisClient = ReturnType<typeof createClient>;

const CACHE_PREFIX = 'cache:';
const memoryStore = new Map<string, CacheEntry>();

let redisClient: RedisClient | null = null;
let redisReady = false;
let redisConnecting: Promise<RedisClient | null> | null = null;

function withPrefix(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

async function getRedisClient(): Promise<RedisClient | null> {
  if (!env.redisUrl) return null;
  if (redisClient && redisReady) return redisClient;
  if (redisConnecting) return redisConnecting;

  redisConnecting = (async () => {
    try {
      const client = createClient({ url: env.redisUrl });
      client.on('error', (err) => {
        console.warn('Redis error', err);
        redisReady = false;
      });
      await client.connect();
      redisClient = client;
      redisReady = true;
      return client;
    } catch (error) {
      console.warn('Redis connection failed, falling back to memory cache', error);
      redisReady = false;
      return null;
    }
  })();

  return redisConnecting;
}

function memoryGet(key: string): string | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

function memorySet(key: string, value: string, ttlSeconds: number) {
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheGet(key: string): Promise<string | null> {
  const prefixedKey = withPrefix(key);
  const client = await getRedisClient();
  if (client) {
    return client.get(prefixedKey);
  }
  return memoryGet(prefixedKey);
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const prefixedKey = withPrefix(key);
  const client = await getRedisClient();
  if (client) {
    await client.set(prefixedKey, value, { EX: ttlSeconds });
    return;
  }
  memorySet(prefixedKey, value, ttlSeconds);
}

export async function cacheDelByPrefix(prefix: string): Promise<void> {
  const client = await getRedisClient();
  const pattern = withPrefix(`${prefix}*`);
  if (client) {
    const keys = await client.keys(pattern);
    if (keys.length) {
      await client.del(keys);
    }
    return;
  }

  for (const key of memoryStore.keys()) {
    if (key.startsWith(withPrefix(prefix))) {
      memoryStore.delete(key);
    }
  }
}

export async function cacheFlush(): Promise<void> {
  const client = await getRedisClient();
  if (client) {
    await client.flushDb();
  }
  memoryStore.clear();
}

export async function cacheRemember<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }
  const data = await loader();
  await cacheSet(key, JSON.stringify(data), ttlSeconds);
  return data;
}
