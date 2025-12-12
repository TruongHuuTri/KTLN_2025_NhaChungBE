import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Redis from 'ioredis';
import {
  UserProfile,
  UserProfileDocument,
} from '../user-profiles/schemas/user-profile.schema';

export type PersonalizationBoosts = {
  boostAmenities?: string[];
};

export type ProfileFallback = {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  wardCodes?: string[];
  roomType?: string[];
};

@Injectable()
export class PersonalizationAgent {
  private readonly logger = new Logger(PersonalizationAgent.name);
  private readonly redis: Redis;

  constructor(
    private readonly cfg: ConfigService,
    @InjectModel(UserProfile.name)
    private readonly userProfileModel: Model<UserProfileDocument>,
  ) {
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
      const hasData = data && Object.keys(data).length > 0;

      const category = hasData ? data.category || undefined : undefined;
      const minPrice =
        hasData && data.minPrice != null && data.minPrice !== ''
          ? Number(data.minPrice)
          : undefined;
      const maxPrice =
        hasData && data.maxPrice != null && data.maxPrice !== ''
          ? Number(data.maxPrice)
          : undefined;
      const wardCodes =
        hasData && data.wardCodes && data.wardCodes.length > 0
          ? data.wardCodes.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined;

      let roomType: string[] | undefined;
      let derivedCategory = category;

      if (!derivedCategory) {
        const profile = await this.userProfileModel
          .findOne({ userId })
          .lean()
          .exec();
        if (profile?.roomType && Array.isArray(profile.roomType)) {
          roomType = profile.roomType;
          const mapped = this.mapRoomTypeToCategory(profile.roomType);
          if (mapped) derivedCategory = mapped;
        }
      }

      if (!hasData && !roomType && !derivedCategory) return undefined;

      return {
        category: derivedCategory,
        minPrice,
        maxPrice,
        wardCodes,
        roomType,
      };
    } catch (e: any) {
      this.logger.warn(`getProfileFallback failed: ${e?.message || e}`);
      return undefined;
    }
  }

  private mapRoomTypeToCategory(types: string[]): string | undefined {
    const normalized = (types || []).map((t) => t.trim().toLowerCase());
    const has = (...keywords: string[]) =>
      normalized.some((t) => keywords.some((k) => t.includes(k)));

    if (has('phòng trọ', 'phong tro')) return 'phong-tro';
    if (
      has(
        'chung cư',
        'chung cu',
        'căn hộ',
        'can ho',
        'căn hộ dv',
        'can ho dv',
        'dv',
        'officetel',
        'studio',
      )
    ) {
      return 'chung-cu';
    }
    if (has('nhà nguyên căn', 'nha nguyen can')) return 'nha-nguyen-can';
    return undefined;
  }
}
