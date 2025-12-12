import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Client } from '@elastic/elasticsearch';

export type ClickEvent = {
  userId: number;
  postId?: number | string; // Post ID (luôn có khi user click vào kết quả search)
  roomId?: number | string; // Room ID (optional, nếu Post có roomId)
  amenities?: string[]; // Optional: nếu FE đã có sẵn thì gửi luôn
};

@Injectable()
export class SignalsService {
  private readonly logger = new Logger(SignalsService.name);
  private readonly redis: Redis;
  private readonly ttlSec: number;
  private readonly listMax: number;

  constructor(
    private readonly cfg: ConfigService,
    @Inject('ES_CLIENT') private readonly es: Client,
  ) {
    const redisUrl = this.cfg.get<string>('REDIS_URL');
    if (redisUrl) this.redis = new Redis(redisUrl);
    else {
      const host = this.cfg.get<string>('REDIS_HOST') || 'localhost';
      const port = Number(this.cfg.get<number>('REDIS_PORT')) || 6379;
      this.redis = new Redis({ host, port });
    }
    this.ttlSec =
      Number(this.cfg.get<number>('USER_SIGNALS_TTL_SEC')) || 7 * 24 * 3600;
    this.listMax = Number(this.cfg.get<number>('USER_SIGNALS_LIST_MAX')) || 100;
  }

  private getHistKey(userId: number) {
    return `user:hist:rooms:${userId}`;
  }
  private getAmenKey(userId: number) {
    return `user:pref:amenities:${userId}`;
  }

  private async ensureExpire(key: string) {
    try {
      const ttl = await this.redis.ttl(key);
      if (ttl < 0) await this.redis.expire(key, this.ttlSec);
    } catch {}
  }

  /**
   * Query ES để lấy amenities và roomId từ postId hoặc roomId
   * Ưu tiên: nếu có roomId thì query bằng roomId, nếu không thì query bằng postId
   */
  private async fetchAmenitiesFromES(
    postId?: number | string,
    roomId?: number | string,
  ): Promise<{ amenities?: string[]; roomId?: number }> {
    const index = this.cfg.get<string>('ELASTIC_INDEX_POSTS') || 'posts';
    
    // Ưu tiên query bằng roomId nếu có
    if (roomId != null) {
      try {
        const resp = await this.es.search({
          index,
          size: 1,
          body: {
            query: { term: { roomId } },
            _source: ['amenities', 'roomId'],
          },
        } as any);
        const hit = (resp as any).hits?.hits?.[0];
        if (hit?._source) {
          const am = hit._source.amenities;
          const rid = hit._source.roomId;
          return {
            amenities: Array.isArray(am) ? am : undefined,
            roomId: rid != null ? Number(rid) : undefined,
          };
        }
      } catch (e: any) {
        this.logger.warn(
          `fetchAmenitiesFromES by roomId=${roomId} failed: ${e?.message || e}`,
        );
      }
    }
    
    // Fallback: query bằng postId nếu có
    if (postId != null) {
      try {
        const resp = await this.es.search({
          index,
          size: 1,
          body: {
            query: { term: { postId } },
            _source: ['amenities', 'roomId'],
          },
        } as any);
        const hit = (resp as any).hits?.hits?.[0];
        if (hit?._source) {
          const am = hit._source.amenities;
          const rid = hit._source.roomId;
          return {
            amenities: Array.isArray(am) ? am : undefined,
            roomId: rid != null ? Number(rid) : undefined,
          };
        }
      } catch (e: any) {
        this.logger.warn(
          `fetchAmenitiesFromES by postId=${postId} failed: ${e?.message || e}`,
        );
      }
    }
    
    return {};
  }

  async logClick(ev: ClickEvent) {
    const { userId, postId, roomId: evRoomId, amenities: evAmenities } = ev;
    if (userId == null) return;
    
    // Phải có ít nhất postId hoặc roomId
    if (postId == null && evRoomId == null) {
      this.logger.warn('logClick: missing both postId and roomId');
      return;
    }

    // 1) Query ES để lấy roomId và amenities nếu chưa có
    let finalRoomId: number | string | undefined = evRoomId;
    let amenities = evAmenities;
    
    if ((!amenities || amenities.length === 0) || !finalRoomId) {
      const esData = await this.fetchAmenitiesFromES(postId, evRoomId);
      if (esData.amenities && (!amenities || amenities.length === 0)) {
        amenities = esData.amenities;
      }
      if (esData.roomId && !finalRoomId) {
        finalRoomId = esData.roomId;
      }
    }

    // 2) Track theo roomId nếu có, nếu không thì track theo postId
    const trackId = finalRoomId ?? postId;
    if (!trackId) {
      this.logger.warn('logClick: cannot determine trackId (roomId or postId)');
      return;
    }

    // 3) Save recent rooms/posts list (dùng roomId nếu có, fallback postId)
    const histKey = this.getHistKey(userId);
    try {
      await this.redis.lpush(histKey, String(trackId));
      await this.redis.ltrim(histKey, 0, this.listMax - 1);
      await this.redis.expire(histKey, this.ttlSec);
    } catch (e: any) {
      this.logger.warn(`logClick lpush failed: ${e?.message || e}`);
    }

    // 4) Increment popularity counters (7-day sliding window)
    try {
      if (finalRoomId != null) {
        const key = 'pop:rooms:7d';
        await this.redis.hincrby(key, String(finalRoomId), 1);
        await this.redis.expire(key, this.ttlSec);
      } else if (postId != null) {
        const key = 'pop:posts:7d';
        await this.redis.hincrby(key, String(postId), 1);
        await this.redis.expire(key, this.ttlSec);
      }
    } catch (e: any) {
      this.logger.warn(`logClick popularity failed: ${e?.message || e}`);
    }

    // 5) Increment amenity preferences
    if (amenities && amenities.length > 0) {
      const key = this.getAmenKey(userId);
      try {
        const multi = this.redis.multi();
        for (const a of amenities) {
          multi.hincrby(key, a, 1);
        }
        multi.expire(key, this.ttlSec);
        await multi.exec();
      } catch (e: any) {
        this.logger.warn(`logClick hincrby failed: ${e?.message || e}`);
      }
    }
  }
}
