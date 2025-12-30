// lib/redis.ts - Custom caching using in-memory cache
import { get, set as setCache, del, clear, getStats } from "./in-memory-cache.ts";

const cache = {
  async get(key: string): Promise<string | null> {
    return Promise.resolve(get(key));
  },

  async set(key: string, value: string, options?: { ex?: number }): Promise<void> {
    return Promise.resolve(setCache(key, value, options?.ex));
  },

  async ttl(key: string): Promise<number> {
    // Simplified TTL for in-memory
    const value = get(key);
    return Promise.resolve(value !== null ? -1 : -2);
  }
};

export default cache;