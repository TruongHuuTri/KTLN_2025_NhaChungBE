import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import Redis from 'ioredis';

export type EmbeddingType = 'query' | 'document';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly redis: Redis;
  private cachedModelName: string | null = null;
  private readonly queryTtlSec: number;

  constructor(private readonly cfg: ConfigService) {
    const apiKey = this.cfg.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required for EmbeddingService');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);

    // TTL config (default 3600s)
    this.queryTtlSec =
      Number(this.cfg.get<number>('EMB_QUERY_TTL_SEC')) || 3600;

    const redisUrl = this.cfg.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
    } else {
      const host = this.cfg.get<string>('REDIS_HOST') || 'localhost';
      const port = Number(this.cfg.get<number>('REDIS_PORT')) || 6379;
      this.redis = new Redis({ host, port });
    }

    this.redis.on('error', (err) => {
      this.logger.error('Redis error in EmbeddingService', err as any);
    });
  }

  private normalizeText(text: string): string {
    return text.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private async getModel(): Promise<GenerativeModel> {
    const modelNames = ['text-embedding-004', 'text-embedding-001'];

    if (this.cachedModelName) {
      try {
        return this.genAI.getGenerativeModel({ model: this.cachedModelName });
      } catch {
        this.cachedModelName = null;
      }
    }

    for (const name of modelNames) {
      if (name === this.cachedModelName) continue;
      try {
        const model = this.genAI.getGenerativeModel({ model: name });
        // lightweight ping
        await model.embedContent('ping');
        this.cachedModelName = name;
        this.logger.log(`✅ EmbeddingService using model: ${name}`);
        return model;
      } catch (e: any) {
        this.logger.warn(`Embedding model ${name} failed: ${e?.message || e}`);
      }
    }

    throw new Error('No working Gemini embedding model available');
  }

  private withTimeout<T>(
    promiseFactory: () => Promise<T>,
    ms: number,
    context: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.logger.warn(
          `EmbeddingService timeout (${ms}ms) in context: ${context}`,
        );
        reject(new Error(`EmbeddingService timeout in ${context}`));
      }, ms);

      promiseFactory()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /**
   * Tạo embedding cho 1 text.
   * - type = 'query' sẽ được cache theo nội dung normalized.
   * - type = 'document' hiện tại không cache (đã lưu trong ES).
   */
  async createEmbedding(text: string, type: EmbeddingType): Promise<number[]> {
    const cleaned = this.normalizeText(text);
    if (!cleaned) return [];

    const cacheKey = type === 'query' ? `emb:query:v1:${cleaned}` : undefined;

    if (cacheKey) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as number[];
        }
      } catch {
        // ignore cache errors
      }
    }

    const model = await this.getModel();

    // Timeout 5s để tránh treo request (đặc biệt là query-time embedding).
    const res = await this.withTimeout(
      () => model.embedContent(cleaned),
      5000,
      type === 'query' ? 'query-embedding' : 'document-embedding',
    );
    const vector = res.embedding.values as number[];

    if (cacheKey) {
      try {
        await this.redis.setex(
          cacheKey,
          this.queryTtlSec,
          JSON.stringify(vector),
        );
      } catch {
        // ignore cache errors
      }
    }

    return vector;
  }
}
