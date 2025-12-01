import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import Redis from 'ioredis';
import NodeGeocoder from 'node-geocoder';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room } from '../rooms/schemas/room.schema';
import { SearchService, SearchPostsParams } from '../search/search.service';
import { GeoCodeService } from '../search/geo-code.service';
import { AmenitiesService } from '../search/amenities.service';
import { ParsedNlpQuery } from './types';

@Injectable()
export class NlpSearchService {
  private readonly logger = new Logger(NlpSearchService.name);
  private genAI: GoogleGenerativeAI;
  private redisClient: Redis;
  private geocoder: NodeGeocoder.Geocoder;
  private cachedWorkingModel: string | null = null;

  constructor(
    private configService: ConfigService,
    @InjectModel(Room.name) private readonly roomModel: Model<Room>,
    private readonly searchService: SearchService,
    private readonly geo: GeoCodeService,
    private readonly amenities: AmenitiesService,
  ) {
    this.genAI = new GoogleGenerativeAI(this.configService.get<string>('GEMINI_API_KEY') as string);

    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redisClient = new Redis(redisUrl);
    } else {
      const redisHost = this.configService.get<string>('REDIS_HOST') || 'localhost';
      const redisPort = Number(this.configService.get<number>('REDIS_PORT')) || 6379;
      this.redisClient = new Redis({ host: redisHost, port: redisPort });
    }
    this.redisClient.on('connect', () => this.logger.log('✅ Connected to Redis'));
    this.redisClient.on('error', (err) => this.logger.error('❌ Redis Client Error', err));

    const options: NodeGeocoder.Options = {
      provider: 'mapbox',
      apiKey: this.configService.get<string>('MAPBOX_API_KEY') as string,
    };
    this.geocoder = NodeGeocoder(options);
  }

  private withTimeout<T>(promiseFactory: () => Promise<T>, ms: number, context: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.logger.warn(`NlpSearchService timeout (${ms}ms) in context: ${context}`);
        reject(new Error(`NlpSearchService timeout in ${context}`));
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

  private extractPoiName(query: string): { poiName: string; city?: string } | null {
    if (!query) return null;
    const q = query.toLowerCase();
    let city: string | undefined;
    const cityMatch = q.match(/(?:tp|thành phố|thanh pho)\s*(hồ chí minh|ho chi minh|hcm)/i);
    if (cityMatch) city = 'Ho Chi Minh City, Vietnam';
    
    const nearMatch = q.match(/\b(gần|gan)\s+([^,]+?)(?:\s*(?:q\d|quận|huyện|tp|thành phố)\b|$)/i);
    if (nearMatch && nearMatch[2]) return { poiName: nearMatch[2].trim(), city };

    const poiPrefixes = ['đại học', 'dai hoc', 'bệnh viện', 'benh vien', 'chợ', 'cho', 'trường', 'truong', 'tttm', 'trung tâm thương mại'];
    for (const prefix of poiPrefixes) {
      const idx = q.indexOf(prefix);
      if (idx >= 0) {
        let poiName = q.substring(idx).trim();
        if (city && poiName.endsWith('thành phố hồ chí minh')) {
          poiName = poiName.replace(/\s*(?:tp|thành phố|thanh pho)\s*(?:hồ chí minh|ho chi minh|hcm)\s*$/i, '').trim();
        }
        return { poiName, city };
      }
    }
    return null;
  }

  private isValidHcmcCoords(lat: number, lon: number): boolean {
    return lat >= 10.3 && lat <= 11.0 && lon >= 106.3 && lon <= 107.0;
  }

  private async geocodePoi(poiName: string, city?: string): Promise<{ lat: number; lon: number } | null> {
    if (!poiName) return null;
    let geocodeQuery = poiName;
    if (city) geocodeQuery = `${poiName}, ${city}`;
    else geocodeQuery = `${poiName}, Ho Chi Minh City, Vietnam`;
    
    const cacheKey = `geo:poi:${geocodeQuery.toLowerCase()}`;
    try {
      const cache = await this.redisClient.get(cacheKey);
      if (cache) {
        const { lat, lon } = JSON.parse(cache);
        if (this.isValidHcmcCoords(lat, lon)) return { lat, lon };
          await this.redisClient.del(cacheKey);
      }
    } catch {}
    
    try {
      const results = await this.geocoder.geocode(geocodeQuery);
      if (results && results.length > 0) {
        let first = results[0];
        for (const r of results) {
          const lat = Number(r.latitude);
          const lon = Number(r.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lon) && this.isValidHcmcCoords(lat, lon)) {
            first = r;
            break;
          }
        }
        const lat = Number(first.latitude);
        const lon = Number(first.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lon) && this.isValidHcmcCoords(lat, lon)) {
          await this.redisClient.set(cacheKey, JSON.stringify({ lat, lon }), 'EX', 60 * 60 * 3);
          this.logger.debug(`Geocoded POI "${poiName}" -> lat=${lat}, lon=${lon}`);
            return { lat, lon };
        }
      }
    } catch (e) {
      this.logger.warn(`Geocode failed for POI "${poiName}": ${e instanceof Error ? e.message : e}`);
    }
    return null;
  }

  private normalizeQuery(query: string): string {
    if (!query) return '';
    return query.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private isSimpleQuery(q: string): boolean {
    const text = this.normalizeQuery(q);
    const tokens = text.split(/\s+/);
    
    // Query quá dài → complex
    if (tokens.length > 20) return false;
    
    // Có logic phức tạp (và, hoặc, nhưng) → complex
    if (/(?:và|hoặc|nhưng|tuy nhiên|ngoài ra)/.test(text)) return false;
    
    // Có từ ngữ cảnh phức tạp (sang trọng, tiện nghi, tương tự) → complex
    if (/(?:sang trọng|tiện nghi|tương tự|như|giống|tương đương)/.test(text)) return false;
    
    // Có pattern rõ ràng → simple
    const hasPrice = /\d+([.,]\d+)?\s*(trieu|triệu|tr|vnđ|vnd)/.test(text) || /\b\d{6,9}\b/.test(text);
    const hasCategoryWord = /(?:phòng trọ|chung cư|căn hộ|nhà nguyên căn)/.test(text);
    const hasDistrictHint = /(?:quận|huyện|q\.|q\s+\d+)/.test(text);
    const hasWardHint = /(?:phường|p\.|p\s+\d+)/.test(text);
    const hasBedroomBathroom = /(?:\d+\s*(?:phòng ngủ|pn|phòng tắm|pt|wc))/.test(text);
    const hasFurniture = /(?:nội thất|furniture|full|basic|none)/.test(text);
    const hasLegalStatus = /(?:sổ hồng|so hong|pháp lý)/.test(text);
    
    // Nếu có ít nhất 1 pattern rõ ràng → simple
    const patternCount = [hasPrice, hasCategoryWord, hasDistrictHint, hasWardHint, hasBedroomBathroom, hasFurniture, hasLegalStatus].filter(Boolean).length;
    return patternCount >= 1; // Chỉ cần 1 pattern là đủ để dùng heuristic
  }

  private enrichLocationWithCodes(parsed: ParsedNlpQuery): ParsedNlpQuery {
    const out = { ...parsed };
    if (!out.wardCodes?.length && out.district) {
      const codes = this.geo.expandDistrictAliasesToWardCodes(out.district);
      if (codes && codes.length) out.wardCodes = codes;
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

  // Cập nhật buildSearchParams để truyền các trường mới
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
      // --- START: Truyền các tham số mới ---
      minBedrooms: parsed.minBedrooms,
      maxBedrooms: parsed.maxBedrooms,
      minBathrooms: parsed.minBathrooms,
      maxBathrooms: parsed.maxBathrooms,
      furniture: parsed.furniture,
      legalStatus: parsed.legalStatus,
      propertyType: parsed.propertyType,
      // --- END: Truyền các tham số mới ---
    };
    if (parsed.minCreatedAt) {
      p.minCreatedAt = parsed.minCreatedAt;
    }
    if (parsed.priceComparison) {
      p.priceComparison = parsed.priceComparison;
    }
    if (parsed.excludeAmenities?.length) {
      p.excludeAmenities = parsed.excludeAmenities;
    }
    if (parsed.excludeDistricts?.length) {
      p.excludeDistricts = parsed.excludeDistricts;
    }
    return p;
  }

  /**
   * Parse NLP query thành SearchPostsParams (không gọi Elasticsearch).
   * Dùng chung cho:
   * - /search/nlp endpoint hiện tại
   * - Hybrid search / personalization trong tương lai.
   */
  async parseQuery(rawQuery: string): Promise<SearchPostsParams> {
    const normalized = this.normalizeQuery(rawQuery);
    const cacheKey = `nlp:parsed:v1:${normalized}`;

    try {
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        this.logger.debug(`⚡️ Parse cache HIT for: ${normalized}`);
        return JSON.parse(cached) as SearchPostsParams;
      }
    } catch {
      // ignore cache errors, tiếp tục parse
    }

    this.logger.debug(`🤔 Parse cache MISS, parsing query: ${normalized}`);

    let parsed: ParsedNlpQuery | null;
    if (this.isSimpleQuery(normalized)) {
      this.logger.debug(`Simple query detected, using heuristic parser (FAST)`);
      parsed = this.heuristicParse(rawQuery);
    } else {
      this.logger.debug(`Complex query detected, using AI parser (SMART)`);
      const aiParsed = await this.aiParse(rawQuery);
      parsed = aiParsed || this.heuristicParse(rawQuery);
    }

    parsed = this.enrichLocationWithCodes(parsed);

    const poiInfo = this.extractPoiName(rawQuery);
    if (poiInfo?.poiName) {
      const coords = await this.geocodePoi(poiInfo.poiName, poiInfo.city);
      if (coords) {
        parsed.lat = coords.lat;
        parsed.lon = coords.lon;
        if (!parsed.distance) parsed.distance = '3km';
      }
      if (!parsed.poiKeywords) parsed.poiKeywords = [];
      if (!parsed.poiKeywords.includes(poiInfo.poiName)) {
        parsed.poiKeywords.push(poiInfo.poiName);
      }
    }

    const params = this.buildSearchParams(parsed);

    try {
      await this.redisClient.set(cacheKey, JSON.stringify(params), 'EX', 3600);
    } catch {
      // ignore cache errors
    }

    return params;
  }

  private async runSearchWithPricePhases(base: SearchPostsParams, limit = 12) {
    const first = await this.searchService.searchPosts({ ...base, page: 1, limit });
    if ((base.minPrice == null && base.maxPrice == null) || first.total >= limit) {
      return first;
    }
    let wideMin = base.minPrice ?? undefined;
    let wideMax = base.maxPrice ?? undefined;
    const factor = 0.3;
    if (wideMin != null) wideMin = Math.max(0, wideMin * (1 - factor));
    if (wideMax != null) wideMax = wideMax * (1 + factor);
    const expanded = await this.searchService.searchPosts({ ...base, minPrice: wideMin, maxPrice: wideMax, page: 1, limit: limit * 2 });
    const seen = new Set(first.items.map(i => i.postId));
    const more = expanded.items.filter(i => !seen.has(i.postId));
    return { ...expanded, total: Math.max(first.total, expanded.total), items: [...first.items, ...more].slice(0, limit) };
  }

  /**
   * Hàm search NLP V1 (giữ lại để backward-compatible cho các call cũ).
   * - Chỉ nhận string q
   * - Cache full kết quả theo query text
   */
  async search(q: string) {
    const normalized = this.normalizeQuery(q);
    const cacheKey = `search:nlp:v3:${normalized}`;
    const cached = await this.redisClient.get(cacheKey);
    if (cached) {
      this.logger.debug(`⚡️ Cache HIT for: ${normalized}`);
      return JSON.parse(cached);
    }
    this.logger.debug(`🤔 Cache MISS! Processing query: ${normalized}`);

    const params = await this.parseQuery(q);
    const result = await this.searchService.searchPosts(params);

    await this.redisClient.set(cacheKey, JSON.stringify(result), 'EX', 3600);
    this.logger.log(`✅ Search completed: ${result.total} results`);
    return result;
  }

  /**
   * Hàm search NLP V2:
   * - Parse query bằng NLP (có cache parse riêng) nếu có rawQuery.
   * - Cho phép FE truyền thêm params (page, sort, chips filter...) để override kết quả parse.
   * - Không cache full kết quả search (để tránh cache sai khi params khác nhau), chỉ tận dụng cache parse.
   * - Nếu rawQuery rỗng, chỉ dùng extraParams (search thuần filter).
   */
  async searchWithParams(
    rawQuery: string,
    extraParams: Partial<SearchPostsParams> = {},
  ) {
    let baseParams: SearchPostsParams = {};
    
    // Chỉ parse NLP nếu có query text
    if (rawQuery && rawQuery.trim()) {
      baseParams = await this.parseQuery(rawQuery);
    }

    const merged: SearchPostsParams = {
      ...baseParams,
      ...extraParams,
    };

    const result = await this.searchService.searchPosts(merged);
    this.logger.log(`✅ NLP search V2 completed: ${result.total} results`);
    return result;
  }

  // Cập nhật prompt để AI hiểu các trường mới
  private readonly GEMINI_SYSTEM_PROMPT = `
Bạn là bộ parser NLP thông minh cho hệ thống tìm phòng trọ/chung cư tại Việt Nam.
Hãy đọc câu tìm kiếm tiếng Việt và trả về JSON KHÔNG có giải thích, với dạng:
{
  "q": string,                     // câu query chuẩn để full-text search
  "postType": "rent" | "roommate" | null,
  "category": "phong-tro" | "chung-cu" | "nha-nguyen-can" | null,
  "minPrice": number | null,       // VND
  "maxPrice": number | null,
  "district": string | null,
  "ward": string | null,
  "amenities": string[] | null,    // dùng keys: gym, ho_boi, ban_cong, ...
  "minBedrooms": number | null,    // ví dụ "2 phòng ngủ" -> minBedrooms: 2
  "minBathrooms": number | null,
  "furniture": "full" | "basic" | "none" | null, // "full nội thất" -> "full", "nội thất cơ bản" -> "basic"
  "legalStatus": "co-so-hong" | "cho-so" | null, // "có sổ hồng" -> "co-so-hong"
  "radiusKm": number | null,
  "minCreatedAtDaysAgo": number | null
}

Yêu cầu NLP:
- Dùng VND cho giá. Ví dụ "7 triệu" → 6000000 đến 8000000.
- amenities phải dùng key chuẩn: "gym", "ho_boi", "ban_cong", ...
- Xử lý số phòng: "2 phòng ngủ" -> minBedrooms: 2.
- Xử lý nội thất: "full nội thất" hoặc "đầy đủ" -> furniture: "full". "nội thất cơ bản" -> "basic". "phòng trống" -> "none".
- Xử lý pháp lý: "có sổ hồng" -> legalStatus: "co-so-hong".
- Nếu không chắc, để null.
`;

  private async aiParse(q: string): Promise<ParsedNlpQuery | null> {
    const modelNames = ['gemini-1.5-flash-latest', 'gemini-pro'];
    let model: GenerativeModel | null = null;
    if (this.cachedWorkingModel) {
      try {
        model = this.genAI.getGenerativeModel({ model: this.cachedWorkingModel });
      } catch (e) { this.cachedWorkingModel = null; }
    }
    if (!model) {
      for (const name of modelNames) {
        if (name === this.cachedWorkingModel) continue;
        try {
          model = this.genAI.getGenerativeModel({ model: name });
            await model.generateContent('Hi');
            this.cachedWorkingModel = name;
            this.logger.log(`✅ Found working Gemini model: ${name}`);
          break;
        } catch (e: any) { continue; }
      }
    }
    if (!model) {
      this.logger.error('All Gemini models failed.');
      return null;
    }
    
    const prompt = this.GEMINI_SYSTEM_PROMPT + `\n\nCâu tìm kiếm: "${q}"\nChỉ trả JSON.`;
    try {
      const result = await this.withTimeout(
        () => model.generateContent(prompt),
        5000,
        'ai-parse',
      );
      const response = await result.response;
      let text = response.text().trim().replace(/```json\s*/g, '').replace(/```\s*/g, '');
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) text = jsonMatch[0];
      const parsed = JSON.parse(text);
      
      const out: ParsedNlpQuery = {
        raw: q,
        q: parsed.q || this.normalizeQuery(q),
        postType: parsed.postType || 'rent',
        category: parsed.category || undefined,
        minPrice: parsed.minPrice ?? undefined,
        maxPrice: parsed.maxPrice ?? undefined,
        district: parsed.district ?? undefined,
        ward: parsed.ward ?? undefined,
        amenities: parsed.amenities ?? undefined,
        // --- START: Map các trường mới từ AI ---
        minBedrooms: parsed.minBedrooms ?? undefined,
        maxBedrooms: parsed.maxBedrooms ?? undefined,
        minBathrooms: parsed.minBathrooms ?? undefined,
        maxBathrooms: parsed.maxBathrooms ?? undefined,
        furniture: parsed.furniture ?? undefined,
        legalStatus: parsed.legalStatus ?? undefined,
        propertyType: parsed.propertyType ?? undefined,
        // --- END: Map các trường mới từ AI ---
      };

      if (parsed.minCreatedAtDaysAgo != null) {
        const days = Number(parsed.minCreatedAtDaysAgo);
        if (!Number.isNaN(days) && days > 0) {
          const d = new Date();
          d.setDate(d.getDate() - days);
          out.minCreatedAt = d.toISOString();
        }
      }
      if (parsed.radiusKm != null) {
        const km = Number(parsed.radiusKm);
        if (!Number.isNaN(km) && km > 0) out.distance = `${km}km`;
      }
      return out;
    } catch (err) {
      this.logger.error('AI parse JSON fail', err);
      return null;
    }
  }

  // Nâng cấp heuristicParse để nhận diện các từ khóa mới
  private heuristicParse(q: string): ParsedNlpQuery {
    const text = this.normalizeQuery(q);
    const result: ParsedNlpQuery = { raw: q, q: text };

    // Category
    if (/chung\s*c[ưu]|căn\s*hộ|cc/i.test(text)) result.category = 'chung-cu';
    else if (/phòng\s*trọ|pt/i.test(text)) result.category = 'phong-tro';
    else if (/nhà\s*nguyên\s*căn|nguyên\s*căn/i.test(text)) result.category = 'nha-nguyen-can';

    // Post type
    result.postType = /(?:ở\s*ghép|o\s*ghep|og|share)/.test(text) ? 'roommate' : 'rent';

    // Price: "7 triệu", "5-8 triệu", "từ 5 đến 8 triệu", "5tr đến 8tr"
    const priceRangeMatch = text.match(/(?:từ|from)?\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr|triệu đồng)\s*(?:đến|to|-|~)\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr|triệu đồng)?/);
    if (priceRangeMatch) {
      let min = parseFloat(priceRangeMatch[1].replace(',', '.'));
      let max = parseFloat(priceRangeMatch[2].replace(',', '.'));
      if (min < 1000) min *= 1_000_000;
      if (max < 1000) max *= 1_000_000;
      result.minPrice = Math.max(0, min * 0.95);
      result.maxPrice = max * 1.05;
    } else {
      const priceMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr|triệu đồng|vnđ|vnd)/) || text.match(/\b(\d{6,9})\b/);
      if (priceMatch) {
        let value = parseFloat(priceMatch[1].replace(',', '.'));
        if (value < 1000) value *= 1_000_000;
        const delta = value * 0.15;
        result.minPrice = Math.max(0, value - delta);
        result.maxPrice = value + delta;
      }
    }

    // Price hints: "giá rẻ" = max 5tr, "giá cao" = min 10tr, "tầm trung" = 5-10tr
    if (/giá\s*rẻ|rẻ|rẻ tiền/i.test(text) && !result.maxPrice) {
      result.maxPrice = 5_000_000;
    } else if (/giá\s*cao|đắt|đắt đỏ/i.test(text) && !result.minPrice) {
      result.minPrice = 10_000_000;
    } else if (/tầm\s*trung|trung bình/i.test(text) && !result.minPrice && !result.maxPrice) {
      result.minPrice = 5_000_000;
      result.maxPrice = 10_000_000;
    }

    // District: "quận 7", "q.7", "q7"
    const districtMatch = text.match(/(?:quận|q\.|q\s*)\s*(\d+|[a-z0-9\s]+)/);
    if (districtMatch) {
      const districtValue = districtMatch[1].trim();
      if (/^\d+$/.test(districtValue)) {
        result.district = `quận ${districtValue}`;
      } else {
        result.district = districtValue;
      }
    }

    // Ward: "phường X", "p.X"
    const wardMatch = text.match(/(?:phường|p\.|p\s*)\s*([a-z0-9\s]+)/);
    if (wardMatch) {
      result.ward = wardMatch[1].trim();
    }

    // Bedrooms: "2 phòng ngủ", "2pn", "2 pn"
    const bedroomsMatch = text.match(/(\d+)\s*(?:phòng\s*ngủ|pn|bedroom)/i);
    if (bedroomsMatch) {
      result.minBedrooms = parseInt(bedroomsMatch[1], 10);
    }

    // Bathrooms: "1 phòng tắm", "1pt", "1 wc"
    const bathroomsMatch = text.match(/(\d+)\s*(?:phòng\s*tắm|pt|wc|bathroom)/i);
    if (bathroomsMatch) {
      result.minBathrooms = parseInt(bathroomsMatch[1], 10);
    }

    // Furniture
    if (/full\s*nội\s*thất|đầy\s*đủ\s*nội\s*thất|nội\s*thất\s*đầy\s*đủ/i.test(text)) {
      result.furniture = 'full';
    } else if (/nội\s*thất\s*cơ\s*bản|cơ\s*bản/i.test(text)) {
      result.furniture = 'basic';
    } else if (/(?:không|ko|khong)\s*nội\s*thất|phòng\s*trống|trống/i.test(text)) {
      result.furniture = 'none';
    }

    // Legal status
    if (/(?:có|co)\s*sổ\s*hồng|sổ\s*hồng|so\s*hong/i.test(text)) {
      result.legalStatus = 'co-so-hong';
    } else if (/chờ\s*sổ|cho\s*so/i.test(text)) {
      result.legalStatus = 'cho-so';
    }

    // Time: "mới đăng", "đăng gần đây", "3 ngày trước"
    const timeMatch = text.match(/(?:mới\s*đăng|đăng\s*gần\s*đây|(\d+)\s*ngày\s*trước)/i);
    if (timeMatch) {
      const days = timeMatch[1] ? parseInt(timeMatch[1], 10) : 7;
      const d = new Date();
      d.setDate(d.getDate() - days);
      result.minCreatedAt = d.toISOString();
    }

    // Area: "30m2", "30 m²", "30 mét vuông"
    const areaMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mét\s*vuông|m\s*vuông)/i);
    if (areaMatch) {
      const area = parseFloat(areaMatch[1].replace(',', '.'));
      result.minArea = area * 0.9;
      result.maxArea = area * 1.1;
    }

    // Amenities (đã có service riêng)
    result.amenities = this.amenities.extractAmenities(q);

    return result;
  }
}
