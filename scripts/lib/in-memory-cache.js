// lib/in-memory-cache.ts - High-performance LRU cache with TTL support
class LRUCache {
    cache = new Map();
    maxSize;
    defaultTTL;
    constructor(maxSize = 1000, defaultTTL = 3600) {
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTL;
    }
    /**
     * Gets a value from the cache with LRU tracking.
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        const now = Date.now();
        // Check if expired
        if (now > entry.expiry) {
            this.cache.delete(key);
            return null;
        }
        // Update access statistics
        entry.lastAccessed = now;
        entry.accessCount++;
        return entry.value;
    }
    /**
     * Sets a value in the cache with TTL and LRU tracking.
     */
    set(key, value, expiryInSeconds) {
        const now = Date.now();
        const ttl = expiryInSeconds || this.defaultTTL;
        const expiry = now + ttl * 1000;
        // If cache is full, evict least recently used item
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictLRU();
        }
        this.cache.set(key, {
            value,
            expiry,
            lastAccessed: now,
            accessCount: 1
        });
    }
    /**
     * Deletes a value from the cache.
     */
    del(key) {
        this.cache.delete(key);
    }
    /**
     * Clears the entire cache.
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Gets cache statistics.
     */
    getStats() {
        const now = Date.now();
        let validEntries = 0;
        let totalAccessCount = 0;
        for (const entry of this.cache.values()) {
            if (now <= entry.expiry) {
                validEntries++;
                totalAccessCount += entry.accessCount;
            }
        }
        return {
            size: this.cache.size,
            validEntries,
            maxSize: this.maxSize,
            hitRate: totalAccessCount > 0 ? (totalAccessCount / (totalAccessCount + (this.cache.size - validEntries))) : 0
        };
    }
    /**
     * Evicts the least recently used item.
     */
    evictLRU() {
        let lruKey = null;
        let lruTime = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccessed < lruTime) {
                lruTime = entry.lastAccessed;
                lruKey = key;
            }
        }
        if (lruKey) {
            this.cache.delete(lruKey);
        }
    }
    /**
     * Cleans up expired entries.
     */
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiry) {
                this.cache.delete(key);
            }
        }
    }
}
// Global cache instance with 2000 max entries and 1 hour default TTL
const globalCache = new LRUCache(2000, 3600);
// Periodic cleanup every 5 minutes
setInterval(() => {
    globalCache.cleanup();
}, 5 * 60 * 1000);
/**
 * Gets a value from the cache.
 * @param key The cache key.
 * @returns The cached value, or null if it's expired or doesn't exist.
 */
export function get(key) {
    return globalCache.get(key);
}
/**
 * Sets a value in the cache with an expiry time.
 * @param key The cache key.
 * @param value The value to cache.
 * @param expiryInSeconds The expiry time in seconds.
 */
export function set(key, value, expiryInSeconds) {
    globalCache.set(key, value, expiryInSeconds);
}
/**
 * Deletes a value from the cache.
 * @param key The cache key.
 */
export function del(key) {
    globalCache.del(key);
}
/**
 * Clears the entire cache.
 */
export function clear() {
    globalCache.clear();
}
/**
 * Gets cache statistics.
 */
export function getStats() {
    return globalCache.getStats();
}
