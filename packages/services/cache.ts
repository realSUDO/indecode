import Redis from "ioredis";

const getRedisUrl = () => process.env.VALKEY_URL || process.env.REDIS_URL || "redis://localhost:6379";

let redisInstance: Redis | null = null;

export function getCache(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(getRedisUrl());
    redisInstance.on("error", (err) => {
      console.error("[Cache Error]:", err);
    });
  }
  return redisInstance;
}

export async function getCached<T>(key: string): Promise<T | null> {
  const cache = getCache();
  const data = await cache.get(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function setCached<T>(key: string, data: T, ttlSeconds?: number): Promise<void> {
  const cache = getCache();
  const serialized = JSON.stringify(data);
  if (ttlSeconds) {
    await cache.set(key, serialized, "EX", ttlSeconds);
  } else {
    await cache.set(key, serialized);
  }
}

export async function invalidateCache(key: string): Promise<void> {
  const cache = getCache();
  await cache.del(key);
}

export async function invalidateCachePattern(pattern: string): Promise<void> {
  const cache = getCache();
  const keys = await cache.keys(pattern);
  if (keys.length > 0) {
    await cache.del(...keys);
  }
}
