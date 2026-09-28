export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  checkRateLimit(identifier: string, limit: number, windowSeconds: number): Promise<{ success: boolean; remaining: number }>;
}

export class MemoryCacheService implements CacheService {
  private cache = new Map<string, { value: unknown; expiresAt?: number }>();
  private rateLimitMap = new Map<string, { count: number; resetAt: number }>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.cache.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async checkRateLimit(identifier: string, limit: number, windowSeconds: number): Promise<{ success: boolean; remaining: number }> {
    const now = Date.now();
    const record = this.rateLimitMap.get(identifier);

    if (!record || now > record.resetAt) {
      this.rateLimitMap.set(identifier, { count: 1, resetAt: now + windowSeconds * 1000 });
      return { success: true, remaining: limit - 1 };
    }

    if (record.count >= limit) {
      return { success: false, remaining: 0 };
    }

    record.count += 1;
    return { success: true, remaining: limit - record.count };
  }
}

export const cacheService: CacheService = new MemoryCacheService();
