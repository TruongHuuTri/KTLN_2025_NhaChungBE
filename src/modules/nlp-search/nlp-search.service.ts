import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { SearchPostsParams } from '../search/search.service';
import { GeoCodeService } from '../search/geo-code.service';
import { ParsedNlpQuery } from './types';
import { OrchestratorService } from '../agent/orchestrator.service';
import { RetrieverAgent } from '../agent/retriever.agent';
import { PersonalizationAgent } from '../agent/personalization.agent';
import { mapParsedToParams } from '../agent/utils/param-mapper';

@Injectable()
export class NlpSearchService {
  private readonly logger = new Logger(NlpSearchService.name);

  private redisClient: Redis;
  private readonly parseTtlSec: number;

  constructor(
    private configService: ConfigService,
    private readonly geo: GeoCodeService,
    private readonly orchestrator: OrchestratorService,
    private readonly retriever: RetrieverAgent,
    private readonly personalization: PersonalizationAgent,
  ) {
    this.parseTtlSec =
      Number(this.configService.get<number>('NLP_PARSE_TTL_SEC')) || 3600;

    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redisClient = new Redis(redisUrl);
    } else {
      const redisHost =
        this.configService.get<string>('REDIS_HOST') || 'localhost';
      const redisPort =
        Number(this.configService.get<number>('REDIS_PORT')) || 6379;
      this.redisClient = new Redis({ host: redisHost, port: redisPort });
    }
    this.redisClient.on('connect', () =>
      this.logger.log('✅ Connected to Redis'),
    );
    this.redisClient.on('error', (err) =>
      this.logger.error('❌ Redis Client Error', err),
    );
  }

  private normalizeQuery(query: string): string {
    if (!query) return '';
    return query.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private enrichLocationWithCodes(parsed: ParsedNlpQuery): ParsedNlpQuery {
    const out = { ...parsed };
    if (!out.wardCodes?.length && out.district) {
      const codes = this.geo.expandDistrictAliasesToWardCodes(out.district);
      if (codes && codes.length) out.wardCodes = codes;
    }
    // Nếu chưa có district/wardCodes, thử bắt alias quận từ raw query (không dấu)
    if (!out.wardCodes?.length) {
      const detected = this.geo.detectDistrictFromText(out.raw || out.q || '');
      if (detected) {
        out.district = out.district || detected.alias;
        out.wardCodes = detected.wardCodes;
      }
    }
    if (!out.wardCodes?.length && out.ward) {
      const resolved = this.geo.resolveWardByName(out.ward);
      if (resolved) {
        out.provinceCode = resolved.provinceCode;
        out.wardCodes = [resolved.wardCode];
      }
    }
    return out;
  }

  private buildSearchParams(parsed: ParsedNlpQuery): SearchPostsParams {
    const p: SearchPostsParams = {
      q: parsed.q || parsed.raw,
      postType: parsed.postType,
      category: parsed.category,
      city: parsed.city,
      district: parsed.district,
      ward: parsed.ward,
      minPrice: parsed.minPrice,
      maxPrice: parsed.maxPrice,
      minArea: parsed.minArea,
      maxArea: parsed.maxArea,
      lat: parsed.lat,
      lon: parsed.lon,
      distance: parsed.distance,
      amenities: parsed.amenities,
      poiKeywords: parsed.poiKeywords,
      province_code: parsed.provinceCode,
      ward_code: parsed.wardCodes,
      minBedrooms: parsed.minBedrooms,
      maxBedrooms: parsed.maxBedrooms,
      minBathrooms: parsed.minBathrooms,
      maxBathrooms: parsed.maxBathrooms,
      furniture: parsed.furniture,
      legalStatus: parsed.legalStatus,
      propertyType: parsed.propertyType,
    };
    if (parsed.minCreatedAt) p.minCreatedAt = parsed.minCreatedAt;
    if (parsed.priceComparison) p.priceComparison = parsed.priceComparison;
    if (parsed.excludeAmenities?.length)
      p.excludeAmenities = parsed.excludeAmenities;
    if (parsed.excludeDistricts?.length)
      p.excludeDistricts = parsed.excludeDistricts;
    return p;
  }

  async parseQuery(rawQuery: string): Promise<SearchPostsParams> {
    const normalized = this.normalizeQuery(rawQuery);
    const cacheKey = `nlp:parsed:v2:${normalized}`;

    try {
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        this.logger.debug(`⚡️ Parse cache HIT for: ${normalized}`);
        const params = JSON.parse(cached) as SearchPostsParams;
        // Fallback category nếu cache không có (tránh trường hợp cache cũ)
        if (!params.category && rawQuery) {
          const t = rawQuery.toLowerCase();
          if (/phòng\s*trọ|phong\s*tro/.test(t)) params.category = 'phong-tro';
          else if (/chung\s*c[ưu]|căn\s*hộ|can\s*ho|chungcu/.test(t))
            params.category = 'chung-cu';
          else if (/nhà\s*nguyên\s*căn|nguyen\s*can|nha\s*nguyen\s*can/.test(t))
            params.category = 'nha-nguyen-can';
        }
        return params;
      }
    } catch {}

    this.logger.debug(`🤔 Parse cache MISS, parsing query: ${normalized}`);

    // Luôn dùng Orchestrator + ParserAgent (Option A). Fallback tối thiểu nếu lỗi.
    const t0 = Date.now();
    const agParsed =
      (await this.orchestrator.parseAndEnrich(rawQuery)) ||
      (await this.orchestrator.parse(rawQuery));
    const parsed: ParsedNlpQuery = agParsed || { raw: rawQuery, q: normalized };
    this.logger.debug(`Parsed by orchestrator in ${Date.now() - t0}ms`);

    const enriched = this.enrichLocationWithCodes(parsed);

    const params = mapParsedToParams(enriched);

    try {
      await this.redisClient.set(
        cacheKey,
        JSON.stringify(params),
        'EX',
        this.parseTtlSec,
      );
    } catch {}

    return params;
  }

  async search(q: string) {
    const normalized = this.normalizeQuery(q);
    const cacheKey = `search:nlp:v3:${normalized}`;
    const cached = await this.redisClient.get(cacheKey);
    if (cached) {
      this.logger.debug(`⚡️ Cache HIT for: ${normalized}`);
      return JSON.parse(cached);
    }
    this.logger.debug(`🤔 Cache MISS! Processing query: ${normalized}`);

    const result = await this.searchWithParams(q);
    await this.redisClient.set(cacheKey, JSON.stringify(result), 'EX', 3600);
    this.logger.log(`✅ Search completed: ${result.total} results`);
    return result;
  }

  async searchWithParams(
    rawQuery: string,
    extraParams: Partial<SearchPostsParams> = {},
  ) {
    let baseParams: SearchPostsParams = {};
    if (rawQuery && rawQuery.trim()) {
      baseParams = await this.parseQuery(rawQuery);
    }

    // Merge params: chỉ override nếu extraParams có giá trị thực sự (không phải undefined/null/empty)
    const merged: SearchPostsParams = {
      ...baseParams,
    };
    // Chỉ override các field nếu extraParams có giá trị hợp lệ
    // Đặc biệt: không override category nếu extraParams.category là undefined/null/empty
    Object.keys(extraParams).forEach((key) => {
      const value = (extraParams as any)[key];
      // Đặc biệt xử lý category: chỉ override nếu có giá trị thực sự và không phải empty string
      if (key === 'category') {
        if (value && typeof value === 'string' && value.trim()) {
          (merged as any)[key] = value.trim();
        }
      } else if (value !== undefined && value !== null && value !== '') {
        (merged as any)[key] = value;
      }
    });
    
    // Fallback category cuối cùng nếu vẫn chưa có (tránh mất category sau khi merge)
    if (!merged.category && rawQuery) {
      const t = rawQuery.toLowerCase();
      if (/phòng\s*trọ|phong\s*tro/.test(t)) merged.category = 'phong-tro';
      else if (/chung\s*c[ưu]|căn\s*hộ|can\s*ho|chungcu/.test(t))
        merged.category = 'chung-cu';
      else if (/nhà\s*nguyên\s*căn|nguyen\s*can|nha\s*nguyen\s*can/.test(t))
        merged.category = 'nha-nguyen-can';
    }

    // Personalization boosts (soft signals)
    try {
      const userId = extraParams.userId ?? baseParams.userId;
      if (userId != null) {
        const boosts = await this.personalization.getBoosts(Number(userId));
        if (boosts?.boostAmenities?.length) {
          const existing = new Set([
            ...(merged.boostAmenities || []),
            ...boosts.boostAmenities,
          ]);
          merged.boostAmenities = Array.from(existing).slice(0, 8);
        }
      }
    } catch (e: any) {
      this.logger.warn(`Personalization boosts ignored: ${e?.message || e}`);
    }
    
    const t0 = Date.now();
    const result = await this.retriever.retrieve(merged);
    this.logger.log(
      `✅ NLP search V2 completed: ${result.total} results in ${Date.now() - t0}ms (path=multi-agent)`,
    );

    // Lưu lịch sử search nếu có userId và có query
    try {
      const userId = merged.userId;
      if (userId != null && rawQuery?.trim()) {
        await this.personalization.saveSearchHistory(
          Number(userId),
          rawQuery.trim(),
        );
      }
    } catch (e: any) {
      this.logger.warn(`Failed to save search history: ${e?.message || e}`);
    }

    return result;
  }

  /**
   * Lấy lịch sử search của user (delegate to PersonalizationAgent)
   */
  async getSearchHistory(userId: number): Promise<string[]> {
    return this.personalization.getSearchHistory(userId);
  }

  /**
   * Zero-query feed: Feed khi chưa nhập từ khóa
   * - Returning user: Personalized feed với boost từ history (ward, price, category, amenities)
   * - New user: Freshness feed (sort by createdAt desc)
   */
  async getZeroQueryFeed(params: {
    userId?: number;
    page?: number;
    limit?: number;
    lat?: number;
    lon?: number;
    category?: string;
    postType?: 'rent' | 'roommate';
  }) {
    const {
      userId,
      page = 1,
      limit = 20,
      lat,
      lon,
      category,
      postType,
    } = params;

    // Returning user: Personalized feed
    if (userId) {
      try {
        const history = await this.personalization.getSearchHistory(userId);
        if (history && history.length > 0) {
          // Parse history để extract ward/district, price, category
          const implicitParams = await this.buildImplicitParamsFromHistory(
            history,
            userId,
          );
          return this.retriever.retrieve({
            ...implicitParams,
            userId,
            page,
            limit,
            lat,
            lon,
            category: category || implicitParams.category,
            postType: postType || implicitParams.postType,
            sort: 'relevance',
          });
        }
        // Fallback: nếu chưa có history, thử dùng profile preference (category/price/wardCodes)
        const profilePref = await this.personalization.getProfileFallback(userId);
        if (profilePref) {
          return this.retriever.retrieve({
            userId,
            page,
            limit,
            lat,
            lon,
            category: category || profilePref.category,
            minPrice: profilePref.minPrice,
            maxPrice: profilePref.maxPrice,
            ward_code: profilePref.wardCodes,
            sort: 'relevance',
          });
        }
      } catch (e: any) {
        this.logger.warn(
          `Failed to build personalized feed: ${e?.message || e}. Falling back to freshness feed.`,
        );
      }
    }

    // New user hoặc không có history hoặc lỗi: Freshness feed
    return this.retriever.retrieve({
      q: '', // match_all
      page,
      limit,
      lat,
      lon,
      category,
      postType,
      sort: 'newest',
    });
  }

  /**
   * Build implicit search params từ lịch sử search
   * Extract: ward/district, price (median), category (most frequent), amenities
   */
  private async buildImplicitParamsFromHistory(
    history: string[],
    userId: number,
  ): Promise<SearchPostsParams> {
    const params: SearchPostsParams = {};

    // Parse queries song song để tăng tốc (tối đa 5 queries gần nhất)
    const queriesToParse = history.slice(0, 5);
    const parsedResults = await Promise.allSettled(
      queriesToParse.map((q) => this.parseQuery(q)),
    );

    // Extract patterns từ parsed results
    const prices: number[] = [];
    const categories: string[] = [];
    const wards: Set<string> = new Set();
    const districts: Set<string> = new Set();

    for (const result of parsedResults) {
      if (result.status === 'fulfilled') {
        const parsed = result.value;
        if (parsed.minPrice) prices.push(parsed.minPrice);
        if (parsed.maxPrice) prices.push(parsed.maxPrice);
        if (parsed.category) categories.push(parsed.category);
        if (parsed.ward_code) {
          if (Array.isArray(parsed.ward_code)) {
            parsed.ward_code.forEach((w) => wards.add(w));
      } else {
            wards.add(parsed.ward_code);
          }
        }
        // Expand district sang wardCodes nếu có
        if (parsed.district && wards.size === 0) {
          const districtWards = this.geo.expandDistrictAliasesToWardCodes(
            parsed.district,
          );
          if (districtWards && districtWards.length > 0) {
            districtWards.forEach((w) => wards.add(w));
    }
        }
        if (parsed.district) districts.add(parsed.district);
      }
    }

    // Median price (correct median calculation)
    if (prices.length > 0) {
      const sorted = prices.sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median =
        sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
      params.minPrice = Math.max(0, Math.floor(median * 0.85));
      params.maxPrice = Math.floor(median * 1.15);
    }

    // Most frequent category
    if (categories.length > 0) {
      const freq: Record<string, number> = {};
      categories.forEach((c) => {
        freq[c] = (freq[c] || 0) + 1;
      });
      const topCategory = Object.entries(freq).sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0];
      if (topCategory) params.category = topCategory;
    }

    // Ward codes (union) - ưu tiên ward codes đã parse, fallback district expansion
    if (wards.size > 0) {
      params.ward_code = Array.from(wards);
    } else if (districts.size > 0) {
      // Nếu không có ward codes, expand từ districts
      const allWards = new Set<string>();
      for (const district of districts) {
        const districtWards =
          this.geo.expandDistrictAliasesToWardCodes(district);
        if (districtWards) {
          districtWards.forEach((w) => allWards.add(w));
    }
      }
      if (allWards.size > 0) {
        params.ward_code = Array.from(allWards);
      }
    }

    // Personalization boosts (amenities)
    try {
      const boosts = await this.personalization.getBoosts(userId);
      if (boosts?.boostAmenities?.length) {
        params.boostAmenities = boosts.boostAmenities;
      }
    } catch (e: any) {
      this.logger.warn(
        `Failed to get personalization boosts: ${e?.message || e}`,
      );
    }

    return params;
  }
}
