import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export type PersonalizationBoosts = {
  boostAmenities?: string[];
};

export type ProfileFallback = {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  wardCodes?: string[];
};

@Injectable()
export class PersonalizationAgent {
  private readonly logger = new Logger(PersonalizationAgent.name);
  private readonly redis: Redis;

  constructor(private readonly cfg: ConfigService) {
    const url = this.cfg.get<string>('REDIS_URL');
    if (url) {
      this.redis = new Redis(url, {
        lazyConnect: true,
        enableReadyCheck: false,
      } as any);
    } else {
      const host = this.cfg.get<string>('REDIS_HOST') || 'localhost';
      const port = Number(this.cfg.get<number>('REDIS_PORT')) || 6379;
      this.redis = new Redis({
        host,
        port,
        lazyConnect: true,
        enableReadyCheck: false,
      });
    }
  }

  async getBoosts(userId: number): Promise<PersonalizationBoosts | undefined> {
    if (userId == null) return undefined;
    try {
      const key = `user:pref:amenities:${userId}`;
      const map = await this.redis.hgetall(key);
      if (!map || Object.keys(map).length === 0) return undefined;
      const entries = Object.entries(map)
        .map(([k, v]) => [k, Number(v)] as [string, number])
        .filter(([, n]) => Number.isFinite(n) && n > 0)
        .sort((a, b) => b[1] - a[1]);
      if (entries.length === 0) return undefined;
      const topN = Number(this.cfg.get<number>('USER_PREF_TOPN')) || 5;
      const boostAmenities = entries.slice(0, topN).map(([k]) => k);
      return { boostAmenities };
    } catch (e: any) {
      this.logger.warn(`getBoosts failed: ${e?.message || e}`);
      return undefined;
    }
  }

  /**
   * Lưu lịch sử search (10 query gần nhất) vào Redis
   * Key: user:search:history:{userId} (list, max 10 items)
   */
  async saveSearchHistory(userId: number, query: string): Promise<void> {
    if (!userId || !query?.trim()) return;
    try {
      const key = `user:search:history:${userId}`;
      const normalized = query.trim().toLowerCase();
      // Xóa duplicate nếu có
      await this.redis.lrem(key, 0, normalized);
      // Thêm vào đầu list
      await this.redis.lpush(key, normalized);
      // Giữ tối đa 10 items
      await this.redis.ltrim(key, 0, 9);
      // TTL 7 ngày để tự làm mới sở thích sau 1 tuần
      await this.redis.expire(key, 7 * 24 * 3600);
    } catch (e: any) {
      this.logger.warn(`saveSearchHistory failed: ${e?.message || e}`);
    }
  }

  /**
   * Lấy lịch sử search (10 query gần nhất)
   */
  async getSearchHistory(userId: number): Promise<string[]> {
    if (!userId) return [];
    try {
      const key = `user:search:history:${userId}`;
      const list = await this.redis.lrange(key, 0, 9);
      return list || [];
    } catch (e: any) {
      this.logger.warn(`getSearchHistory failed: ${e?.message || e}`);
      return [];
    }
  }

  /**
   * Lấy thông tin ưu tiên mặc định từ profile (nếu đã được lưu ở Redis).
   * Key kỳ vọng: user:profile:pref:{userId}
   * Các trường hỗ trợ: category, minPrice, maxPrice, wardCodes (csv)
   */
  async getProfileFallback(userId: number): Promise<ProfileFallback | undefined> {
    if (!userId) return undefined;
    try {
      const key = `user:profile:pref:${userId}`;
      const data = await this.redis.hgetall(key);
      if (!data || Object.keys(data).length === 0) return undefined;

      const category = data.category || undefined;
      const minPrice =
        data.minPrice != null && data.minPrice !== ''
          ? Number(data.minPrice)
          : undefined;
      const maxPrice =
        data.maxPrice != null && data.maxPrice !== ''
          ? Number(data.maxPrice)
          : undefined;
      const wardCodes =
        data.wardCodes && data.wardCodes.length > 0
          ? data.wardCodes.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined;

      return { category, minPrice, maxPrice, wardCodes };
    } catch (e: any) {
      this.logger.warn(`getProfileFallback failed: ${e?.message || e}`);
      return undefined;
    }
  }
}
