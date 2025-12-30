// lib/cache.ts - High-performance caching layer
import { get, set as setCache, del, clear, getStats } from "./in-memory-cache.ts";
const redis = {
    get,
    set: (key, value, options) => setCache(key, value, options.ex),
    del,
    clear,
    getStats,
    // Redis-compatible methods for existing code
    setex: (key, ttl, value) => setCache(key, value, ttl),
    getset: (key, value) => {
        const oldValue = get(key);
        setCache(key, value);
        return oldValue;
    },
    exists: (key) => (get(key) !== null ? 1 : 0),
    ttl: (key) => {
        // This is a simplified TTL check - in real Redis this would return seconds remaining
        const value = get(key);
        return value !== null ? -1 : -2; // -1 means no TTL, -2 means key doesn't exist
    }
};
export default redis;
