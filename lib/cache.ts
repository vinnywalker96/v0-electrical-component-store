// lib/cache.ts
import { get, set as setCache, del } from "./in-memory-cache";

const redis = {
  get,
  set: (key: string, value: string, options: { ex: number }) => setCache(key, value, options.ex),
  del,
};

export default redis;