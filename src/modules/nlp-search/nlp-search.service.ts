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
  private cachedWorkingModel: string | null = null; // Cache working model name
  
  // Stop words to remove from query for better matching
  private readonly stopWords = new Set([
    'tìm', 'tim', 'cần', 'can', 'muốn', 'muon', 'có', 'co',
    'cho', 'thuê', 'thue', 'ở', 'o', 'tại', 'tai', 'gần', 'gan',
    'với', 'voi', 'và', 'va', 'của', 'cua', 'theo', 'mới', 'moi'
  ]);

  constructor(
    private configService: ConfigService,
    @InjectModel(Room.name) private readonly roomModel: Model<Room>,
    private readonly searchService: SearchService,
    private readonly geo: GeoCodeService,
    private readonly amenities: AmenitiesService,
  ) {
    this.genAI = new GoogleGenerativeAI(
      this.configService.get<string>('GEMINI_API_KEY') as string,
    );

    // Khởi tạo Redis Client
    // Hỗ trợ cả REDIS_URL (Render) hoặc REDIS_HOST + REDIS_PORT
    // Tự động fallback về localhost nếu không có config (cho local development)
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redisClient = new Redis(redisUrl);
    } else {
      const redisHost = this.configService.get<string>('REDIS_HOST') || 'localhost';
      const redisPort = Number(this.configService.get<number>('REDIS_PORT')) || 6379;
      this.redisClient = new Redis({
        host: redisHost,
        port: redisPort,
      });
    }
    this.redisClient.on('connect', () => console.log('✅ Connected to Redis'));
    this.redisClient.on('error', (err) => console.error('❌ Redis Client Error', err));

    const options: NodeGeocoder.Options = {
      provider: 'mapbox',
      apiKey: this.configService.get<string>('MAPBOX_API_KEY') as string,
    };
    this.geocoder = NodeGeocoder(options);
  }

  // Extract simple POI pattern like "gần ...", "gan ...", or common POI phrases
  // Returns { poiName, city } to preserve context
  private extractPoiName(query: string): { poiName: string; city?: string } | null {
    if (!query) return null;
    const q = query.toLowerCase();
    
    // Extract city context if present
    let city: string | undefined;
    const cityMatch = q.match(/(?:tp|thành phố|thanh pho)\s*(hồ chí minh|ho chi minh|hcm)/i);
    if (cityMatch) {
      city = 'Ho Chi Minh City, Vietnam';
    }
    
    // Patterns: gần/gan <poi>, đại học|bệnh viện|chợ|trường|TTTM ...
    const nearMatch = q.match(/\b(gần|gan)\s+([^,]+?)(?:\s*(?:q\d|quận|huyện|tp|thành phố)\b|$)/i);
    if (nearMatch && nearMatch[2]) {
      return { poiName: nearMatch[2].trim(), city };
    }
    // Heuristic: if contains well-known prefixes
    const poiPrefixes = ['đại học', 'dai hoc', 'bệnh viện', 'benh vien', 'chợ', 'cho', 'trường', 'truong', 'tttm', 'trung tâm thương mại'];
    for (const prefix of poiPrefixes) {
      const idx = q.indexOf(prefix);
      if (idx >= 0) {
        // Extract POI name, preserve city context if found
        let poiName = q.substring(idx).trim();
        // Remove city from POI name if it's at the end
        if (city && poiName.endsWith('thành phố hồ chí minh')) {
          poiName = poiName.replace(/\s*(?:tp|thành phố|thanh pho)\s*(?:hồ chí minh|ho chi minh|hcm)\s*$/i, '').trim();
        }
        return { poiName, city };
      }
    }
    return null;
  }

  // Validate coordinates are in Ho Chi Minh City (rough bounds)
  private isValidHcmcCoords(lat: number, lon: number): boolean {
    // HCMC approximate bounds: lat 10.3-11.0, lon 106.3-107.0
    return lat >= 10.3 && lat <= 11.0 && lon >= 106.3 && lon <= 107.0;
  }

  private async geocodePoi(poiName: string, city?: string): Promise<{ lat: number; lon: number } | null> {
    if (!poiName) return null;
    
    // Build geocode query with city context for better accuracy
    let geocodeQuery = poiName;
    if (city) {
      geocodeQuery = `${poiName}, ${city}`;
    } else {
      // Default to HCMC if no city specified (most common case)
      geocodeQuery = `${poiName}, Ho Chi Minh City, Vietnam`;
    }
    
    const cacheKey = `geo:poi:${geocodeQuery.toLowerCase()}`;
    try {
      const cache = await this.redisClient.get(cacheKey);
      if (cache) {
        const { lat, lon } = JSON.parse(cache);
        // Validate cached coords are still valid (HCMC)
        if (this.isValidHcmcCoords(lat, lon)) {
          return { lat, lon };
        } else {
          // Invalid cache, delete it
          await this.redisClient.del(cacheKey);
        }
      }
    } catch {}
    
    try {
      const results = await this.geocoder.geocode(geocodeQuery);
      if (results && results.length > 0) {
        // Try to find result in HCMC first
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
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          // Only cache if valid HCMC coordinates
          if (this.isValidHcmcCoords(lat, lon)) {
            await this.redisClient.set(cacheKey, JSON.stringify({ lat, lon }), 'EX', 60 * 60 * 3); // 3h
            this.logger.debug(`Geocoded POI "${poiName}" -> lat=${lat}, lon=${lon} (validated HCMC)`);
            return { lat, lon };
          } else {
            this.logger.warn(`Geocoded POI "${poiName}" -> lat=${lat}, lon=${lon} (OUTSIDE HCMC, rejected)`);
            return null;
          }
        }
      }
    } catch (e) {
      this.logger.warn(`Geocode failed for POI "${poiName}": ${e instanceof Error ? e.message : e}`);
    }
    return null;
  }

  /**
   * Normalize and clean query text
   */
  private normalizeQuery(query: string): string {
    if (!query) return '';
    return query
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  /**
   * Phân loại query: simple (dùng heuristic) vs complex (dùng AI)
   */
  private isSimpleQuery(q: string): boolean {
    const text = this.normalizeQuery(q);
    const tokens = text.split(/\s+/);

    // Query quá dài → coi là phức tạp
    if (tokens.length > 14) return false;

    // Có các từ này thì coi là phức tạp (cần AI)
    const complexWords = [
      'gần',
      'bán kính',
      'trong vòng',
      'trong bán kính',
      'mới đăng',
      'trong 3 ngày',
      'trong 7 ngày',
      'gần trường',
      'gần chợ',
    ];
    if (complexWords.some(w => text.includes(w))) return false;

    // Có giá kiểu "7 triệu" / "3.5 triệu" / "3000000"
    const hasPrice =
      /\d+([.,]\d+)?\s*(trieu|triệu|tr|vnđ|vnd)/.test(text) ||
      /\b\d{6,9}\b/.test(text); // số VND thẳng

    // Có từ loại nhà
    const hasCategoryWord =
      text.includes('phòng trọ') ||
      text.includes('chung cư') ||
      text.includes('căn hộ') ||
      text.includes('nhà nguyên căn');

    // Có quận/huyện
    const hasDistrictHint = text.includes('quận') || text.includes('huyện') || text.includes('q.');

    return hasPrice || hasCategoryWord || hasDistrictHint;
  }

  // Extract ward name pattern like "phường <name>" (prefer code mapping over geocoding)
  private extractWardName(query: string): string | null {
    if (!query) return null;
    const m = query.toLowerCase().match(/phường\s+([\p{L}\s]+?)(?:\bquận|\bhuyện|\btp|\bthành phố|$)/u);
    if (m && m[1]) return m[1].trim();
    return null;
  }

  /**
   * Map district/ward names → codes (dùng GeoCodeService)
   */
  private enrichLocationWithCodes(parsed: ParsedNlpQuery): ParsedNlpQuery {
    const out = { ...parsed };

    // district → wardCodes bằng alias mapping
    if (!out.wardCodes?.length && out.district) {
      const codes = this.geo.expandDistrictAliasesToWardCodes(out.district);
      if (codes && codes.length) {
        out.wardCodes = codes;
      }
    }

    // Nếu NLP parse ward name rõ, bạn có thể dùng resolveWardByName
    if (!out.wardCodes?.length && out.ward) {
      const resolved = this.geo.resolveWardByName(out.ward);
      if (resolved) {
        out.provinceCode = resolved.provinceCode;
        out.wardCodes = [resolved.wardCode];
      }
    }

    return out;
  }

  /**
   * Build SearchPostsParams từ ParsedNlpQuery
   */
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
      // Không dùng district_code vì mapping chỉ là helper, không có districtCodes thực sự
      ward_code: parsed.wardCodes,
    };

    // Thời gian
    if (parsed.minCreatedAt) {
      // Chút nữa SearchService sẽ đọc để filter createdAt
      (p as any).minCreatedAt = parsed.minCreatedAt;
    }

    return p;
  }

  /**
   * 2-phase search theo giá (áp dụng cho mọi giá)
   */
  private async runSearchWithPricePhases(base: SearchPostsParams, limit = 12) {
    // Phase 1: dùng range core (minPrice, maxPrice từ NLP)
    const first = await this.searchService.searchPosts({
      ...base,
      page: 1,
      limit,
    });

    // Nếu không có min/max hoặc đã đủ bài → trả luôn
    if ((base.minPrice == null && base.maxPrice == null) || first.total >= limit) {
      return first;
    }

    // Phase 2: mở rộng range — nhưng vẫn ưu tiên kết quả phase 1
    let wideMin = base.minPrice ?? undefined;
    let wideMax = base.maxPrice ?? undefined;
    const factor = 0.3; // ±30%

    if (wideMin != null) wideMin = Math.max(0, wideMin * (1 - factor));
    if (wideMax != null) wideMax = wideMax * (1 + factor);

    const expanded = await this.searchService.searchPosts({
      ...base,
      minPrice: wideMin,
      maxPrice: wideMax,
      page: 1,
      limit: limit * 2,
    });

    const seen = new Set(first.items.map(i => i.postId));
    const more = expanded.items.filter(i => !seen.has(i.postId));

    return {
      ...expanded,
      total: Math.max(first.total, expanded.total),
      items: [...first.items, ...more].slice(0, limit),
    };
  }

  /**
   * Query expansion khi zero results - mở rộng điều kiện tìm kiếm
   */
  private expandQueryForZeroResults(parsed: ParsedNlpQuery): ParsedNlpQuery {
    const expanded = { ...parsed };

    // Mở rộng giá ±50% nếu có
    if (expanded.minPrice != null || expanded.maxPrice != null) {
      if (expanded.minPrice != null) {
        expanded.minPrice = Math.max(0, expanded.minPrice * 0.5);
      }
      if (expanded.maxPrice != null) {
        expanded.maxPrice = expanded.maxPrice * 1.5;
      }
    }

    // Mở rộng distance nếu có POI
    if (expanded.distance) {
      const currentKm = parseFloat(expanded.distance.replace('km', ''));
      if (!Number.isNaN(currentKm)) {
        expanded.distance = `${Math.min(currentKm * 2, 10)}km`; // max 10km
      }
    }

    // Bỏ category filter nếu có (tìm tất cả loại)
    // expanded.category = undefined; // Comment để giữ category

    return expanded;
  }

  /**
   * Semantic query expansion - tìm theo ý nghĩa, không chỉ keyword
   */
  private async semanticQueryExpansion(q: string): Promise<string[]> {
    // Tạo các biến thể semantic của query
    const expansions: string[] = [q];

    // Ví dụ: "chung cư" → "căn hộ", "apartment"
    const qLower = q.toLowerCase();
    if (qLower.includes('chung cư')) {
      expansions.push(q.replace(/chung cư/gi, 'căn hộ'));
      expansions.push(q.replace(/chung cư/gi, 'apartment'));
    }
    if (qLower.includes('phòng trọ')) {
      expansions.push(q.replace(/phòng trọ/gi, 'phòng cho thuê'));
      expansions.push(q.replace(/phòng trọ/gi, 'room for rent'));
    }

    return expansions;
  }

  /**
   * Hàm search(q) hoàn chỉnh (NlpSearchService) - VERSION 2.0: Thông minh hơn
   */
  async search(q: string) {
    const normalized = this.normalizeQuery(q);

    // 1. Cache
    const cacheKey = `search:nlp:v2:${normalized}`;
    const cached = await this.redisClient.get(cacheKey);
    if (cached) {
      this.logger.debug(`⚡️ Cache HIT for: ${normalized}`);
      return JSON.parse(cached);
    }
    this.logger.debug(`🤔 Cache MISS! Processing query: ${normalized}`);

    // 2. Simple vs Complex - THÔNG MINH HƠN
    let parsed: ParsedNlpQuery | null;

    if (this.isSimpleQuery(normalized)) {
      this.logger.debug(`Simple query detected, using heuristic parser (FAST)`);
      parsed = this.heuristicParse(q);
    } else {
      this.logger.debug(`Complex query detected, using AI parser (SMART)`);
      const aiParsed = await this.aiParse(q);
      if (aiParsed) {
        parsed = aiParsed;
      } else {
        this.logger.warn(`AI parse failed, falling back to heuristic`);
        parsed = this.heuristicParse(q); // fallback
      }
    }

    // 3. Bổ sung location codes
    parsed = this.enrichLocationWithCodes(parsed);

    // 4. Handle POI geocoding nếu có
    const poiInfo = this.extractPoiName(q);
    if (poiInfo && poiInfo.poiName) {
      const coords = await this.geocodePoi(poiInfo.poiName, poiInfo.city);
      if (coords) {
        parsed.lat = coords.lat;
        parsed.lon = coords.lon;
        if (!parsed.distance) parsed.distance = '3km';
      }
      // Luôn thêm POI keywords để boost title/description
      if (!parsed.poiKeywords) parsed.poiKeywords = [];
      if (!parsed.poiKeywords.includes(poiInfo.poiName)) {
        parsed.poiKeywords.push(poiInfo.poiName);
      }
    }

    // 5. Build SearchPostsParams
    const params = this.buildSearchParams(parsed);

    // 6. Chạy search 2-phase theo giá
    let result = await this.runSearchWithPricePhases(params, 12);

    // 7. ZERO RESULTS HANDLING - Query expansion thông minh
    if (result.total === 0 || result.items.length === 0) {
      this.logger.warn(`⚠️ Zero results, attempting query expansion...`);
      
      // Strategy 1: Mở rộng điều kiện
      const expanded = this.expandQueryForZeroResults(parsed);
      const expandedParams = this.buildSearchParams(expanded);
      const expandedResult = await this.runSearchWithPricePhases(expandedParams, 12);
      
      if (expandedResult.total > 0) {
        this.logger.log(`✅ Query expansion found ${expandedResult.total} results`);
        result = {
          ...expandedResult,
          _expanded: true, // Flag để frontend biết đã expand
          _originalQuery: q,
        } as any;
      } else {
        // Strategy 2: Semantic expansion
        const semanticQueries = await this.semanticQueryExpansion(q);
        for (const semanticQ of semanticQueries.slice(1)) { // Skip original
          const semanticParsed = this.heuristicParse(semanticQ);
          const semanticParams = this.buildSearchParams(semanticParsed);
          const semanticResult = await this.runSearchWithPricePhases(semanticParams, 12);
          if (semanticResult.total > 0) {
            this.logger.log(`✅ Semantic expansion found ${semanticResult.total} results`);
            result = {
              ...semanticResult,
              _expanded: true,
              _semantic: true,
              _originalQuery: q,
            } as any;
            break;
          }
        }
      }
    }

    // 8. Cache
    await this.redisClient.set(cacheKey, JSON.stringify(result), 'EX', 3600);
    this.logger.log(`✅ Search completed: ${result.total} results (expanded: ${(result as any)._expanded || false})`);

    return result;
  }

  /**
   * Prompt cho Gemini (dùng khi query phức tạp) - VERSION 2.0: Hỗ trợ NLP đầy đủ
   */
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
  "excludeAmenities": string[] | null,  // tiện ích cần tránh: ["gym"] nếu user nói "không có gym"
  "excludeDistricts": string[] | null,  // quận cần tránh: ["quận 1"] nếu user nói "tránh quận 1"
  "poiKeywords": string[] | null,  // tên POI: ["Đại học Công nghiệp", "IUH"]
  "radiusKm": number | null,
  "minCreatedAtDaysAgo": number | null,  // ví dụ user nói "3 ngày gần đây" → 3
  "priceComparison": "cheaper" | "more_expensive" | null  // "rẻ hơn" → "cheaper", "đắt hơn" → "more_expensive"
}

Yêu cầu NLP:
- Dùng VND, không viết "7 triệu" trong minPrice, maxPrice. Ví dụ "7 triệu" → 6000000 đến 8000000.
- Nếu người dùng chỉ nói "gần IUH" thì để minPrice,maxPrice = null.
- amenities phải dùng key chuẩn: "gym", "ho_boi", "ban_cong", ...
- Xử lý negative: "không có gym" → excludeAmenities: ["gym"], "tránh quận 1" → excludeDistricts: ["quận 1"]
- Xử lý so sánh: "rẻ hơn" → priceComparison: "cheaper", "đắt hơn" → priceComparison: "more_expensive"
- Xử lý điều kiện phức tạp: "gần trường nhưng không quá xa chợ" → parse cả 2 POI, ưu tiên trường
- Nếu không chắc, để null.
`;

  /**
   * AI parser - gọi Gemini để parse query phức tạp
   */
  private async aiParse(q: string): Promise<ParsedNlpQuery | null> {
    const modelNames = [
      'gemini-2.5-flash',
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ];
    let model: GenerativeModel | null = null;
    let lastError: Error | null = null;
    
    // Try cached model first
    if (this.cachedWorkingModel) {
      try {
        model = this.genAI.getGenerativeModel({ model: this.cachedWorkingModel });
        this.logger.debug(`Using cached working model: ${this.cachedWorkingModel}`);
      } catch (e) {
        this.cachedWorkingModel = null;
      }
    }
    
    // Try all models if no cached
    if (!model) {
      for (const name of modelNames) {
        if (name === this.cachedWorkingModel) continue;
        try {
          model = this.genAI.getGenerativeModel({ model: name });
          if (!this.cachedWorkingModel) {
            await model.generateContent('Hi');
            this.cachedWorkingModel = name;
            this.logger.log(`✅ Found working Gemini model: ${name}`);
          }
          break;
        } catch (e: any) {
          lastError = e;
          continue;
        }
      }
    }
    
    if (!model) {
      this.logger.error(`All Gemini models failed. ${lastError?.message || 'No model available'}`);
      return null;
    }
    
    const prompt = this.GEMINI_SYSTEM_PROMPT + `\n\nCâu tìm kiếm: "${q}"\nChỉ trả JSON.`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();
      text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/^[\s\n]*\{/, '{').replace(/\}[\s\n]*$/, '}');
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
        excludeAmenities: parsed.excludeAmenities ?? undefined,
        excludeDistricts: parsed.excludeDistricts ?? undefined,
        poiKeywords: parsed.poiKeywords ?? undefined,
        priceComparison: parsed.priceComparison ?? undefined,
      };

      // Thời gian đăng
      if (parsed.minCreatedAtDaysAgo != null) {
        const days = Number(parsed.minCreatedAtDaysAgo);
        if (!Number.isNaN(days) && days > 0) {
          const d = new Date();
          d.setDate(d.getDate() - days);
          out.minCreatedAt = d.toISOString();
        }
      }

      // Distance/radius
      if (parsed.radiusKm != null) {
        const km = Number(parsed.radiusKm);
        if (!Number.isNaN(km) && km > 0) {
          out.distance = `${km}km`;
        }
      }

      return out;
    } catch (err) {
      this.logger.error('AI parse JSON fail', err);
      return null;
    }
  }

  /**
   * Heuristic parser (fallback / cho simple query)
   * Trả về ParsedNlpQuery
   */
  private heuristicParse(q: string): ParsedNlpQuery {
    const text = this.normalizeQuery(q);
    const result: ParsedNlpQuery = { raw: q, q: text };

    // Category
    if (text.includes('chung cư') || text.includes('căn hộ')) {
      result.category = 'chung-cu';
    } else if (text.includes('phòng trọ')) {
      result.category = 'phong-tro';
    } else if (text.includes('nhà nguyên căn') || text.includes('nguyên căn')) {
      result.category = 'nha-nguyen-can';
    }

    // Post type
    result.postType = 'rent'; // mặc định, sau này nếu có từ 'ở ghép' mới set roommate
    if (text.includes('ở ghép') || text.includes('o ghep')) {
      result.postType = 'roommate';
    }

    // Giá: ví dụ "7 triệu", "3.5 triệu", "3tr"
    const priceMatch =
      text.match(/(\d+(?:[.,]\d+)?)\s*(trieu|triệu|tr)/) ||
      text.match(/(\d{6,9})\s*(vnd|vnđ)?/);
    if (priceMatch) {
      let n = priceMatch[1].replace(',', '.');
      let value = parseFloat(n);

      if (value < 1000) {
        // coi là triệu
        value = value * 1_000_000;
      }
      const delta = value * 0.15; // ±15% range core
      result.minPrice = Math.max(0, value - delta);
      result.maxPrice = value + delta;
    }

    // District name: đơn giản, bạn có thể refine thêm sau
    const districtMatch = text.match(/quận\s+([a-z0-9\s]+)/);
    if (districtMatch) {
      result.district = districtMatch[1].trim();
    }

    // Amenities: dùng AmenitiesService để map từ text → key
    result.amenities = this.amenities.extractAmenities(q);

    return result;
  }

  private async getTextToAggregation(query: string): Promise<any[]> {
    // Try different model names - same as parseQueryWithAI
    const modelNames = ['gemini-2.5-flash', 'gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'];
    let model: GenerativeModel | null = null;
    
    for (const name of modelNames) {
      try {
        model = this.genAI.getGenerativeModel({ model: name });
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!model) {
      this.logger.warn('No Gemini model available, returning empty pipeline');
      return [];
    }
    const prompt = `
You are a master real estate search assistant for a rental platform in Vietnam. Your task is to convert a user's natural language query into a precise MongoDB aggregation pipeline JSON array.

The data schema you will query against combines room and post information:
{
  "postStatus": String, "postType": String, "category": String, "area": Number,
  "price": Number, "deposit": Number, "furniture": String,
  "status": String,
  "address": { "street": String, "wardName": String, "provinceName": String },
  "utilities": { "electricityPricePerKwh": Number, "waterPrice": Number, "internetFee": Number }
}

User query: "${query}"

RULES:
1. **Default Filter:** ALWAYS include a stage at the beginning to match only active posts and available rooms: { "$match": { "status": "available", "isActive": true } }.
2. **Location:** If the query mentions a location (e.g., "quận 1", "Thủ Đức", "Hai Bà Trưng"), create a preliminary stage: { "$addFields": { "locationName": "tên địa điểm đó" } }. Extract location name from query.
3. **Price:** For "giá dưới 3 triệu" or "dưới 3 triệu", use { "$match": { "price": { "$lt": 3000000 } } }. For "tầm 6 triệu", use { "$match": { "price": { "$gte": 5000000, "$lte": 7000000 } } }.
4. **Area:** For "diện tích trên 20m2", use { "$match": { "area": { "$gt": 20 } } }.
5. **Category:** If query mentions "chung cư", set { "$match": { "category": "chung-cu" } }. For "phòng trọ", use "phong-tro".
6. Ignore occupancy fields (no max occupancy constraint in schema).
7. **Utilities:** For "bao điện nước", prefer matching price fields equals 0 if provided by UI.
8. **Output:** Your response MUST BE ONLY a valid JSON array. No explanations, no markdown code blocks, no text before or after. Start with [ and end with ].
    `.trim();

    try {
      this.logger.debug(`Calling Gemini with query: "${query}"`);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Log raw response for debugging
      this.logger.debug(`Gemini raw response: ${text.substring(0, 200)}...`);
      
      // Clean up markdown code blocks and extra whitespace
      text = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^[\s\n]*\[/, '[') // Remove text before [
        .replace(/\]\s*$/, ']') // Remove text after ]
        .trim();
      
      // Try to extract JSON array if there's text around it
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        text = jsonMatch[0];
      }
      
      this.logger.debug(`Cleaned JSON text: ${text.substring(0, 100)}...`);
      
      const parsed = JSON.parse(text);
      
      if (!Array.isArray(parsed)) {
        this.logger.error('Gemini returned non-array result');
        return [];
      }
      
      if (parsed.length === 0) {
        this.logger.warn('Gemini returned empty pipeline');
      } else {
        this.logger.log(`Successfully parsed pipeline with ${parsed.length} stages`);
      }
      
      return parsed;
    } catch (error: any) {
      this.logger.error(`Error calling Gemini AI or parsing response: ${error?.message || error}`);
      this.logger.error(`Error stack: ${error?.stack || 'N/A'}`);
      
      // Return a basic fallback pipeline
      this.logger.warn('Returning fallback pipeline');
      return [
        {
          $match: {
            status: 'available',
            isActive: true,
          },
        },
      ];
    }
  }

  private async handleGeocoding(pipeline: any[]): Promise<any[]> {
    const addFieldsStageIndex = pipeline.findIndex((stage) => stage.$addFields && stage.$addFields.locationName);
    if (addFieldsStageIndex === -1) return pipeline;

    const locationName = pipeline[addFieldsStageIndex].$addFields.locationName;
    try {
      const cacheKey = `geo:mapbox:${locationName.toLowerCase().trim()}`;
      let longitude: number | null = null;
      let latitude: number | null = null;
      
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        const [lon, lat] = JSON.parse(cached);
        longitude = lon;
        latitude = lat;
      } else {
        const geoResult = await this.geocoder.geocode(`${locationName}, Vietnam`);
        if (geoResult.length > 0) {
          const lon = geoResult[0].longitude;
          const lat = geoResult[0].latitude;
          if (typeof lon === 'number' && typeof lat === 'number') {
            longitude = lon;
            latitude = lat;
            await this.redisClient.set(cacheKey, JSON.stringify([longitude, latitude]), 'EX', 60 * 60 * 24 * 30);
          }
        }
      }
      if (longitude != null && latitude != null) {
        const geoNearStage = {
          $geoNear: {
            near: { type: 'Point', coordinates: [longitude, latitude] },
            distanceField: 'distance',
            maxDistance: 10000,
            spherical: true,
            key: 'address.location',
          },
        };
        const cloned = [...pipeline];
        cloned.splice(addFieldsStageIndex, 1);
        cloned.unshift(geoNearStage);
        return cloned;
      }
    } catch (error) {
      console.error('Mapbox Geocoding failed:', error);
    }
    const fallback = [...pipeline];
    fallback.splice(addFieldsStageIndex, 1);
    return fallback;
  }

  private async updateUserPreferences(userId: string, pipeline: any[]): Promise<void> {
    // Dùng Redis HINCRBY để tăng số đếm cho mỗi tiêu chí
    // Đây là một ví dụ đơn giản, bạn có thể làm logic này phức tạp hơn
    for (const stage of pipeline) {
      if (stage.$match) {
        if (stage.$match.price) {
          await this.redisClient.hincrby(userId, 'pref:price', 1);
        }
        if (stage.$match.area) {
          await this.redisClient.hincrby(userId, 'pref:area', 1);
        }
      }
    }
  }

  private async rankResults(userId: string, results: any[]): Promise<any[]> {
    const prefs = await this.redisClient.hgetall(userId);
    const pricePrefCount = parseInt(prefs['pref:price'] || '0', 10);
    return results
      .map((room) => {
        let score = 100;
        if (pricePrefCount > 2 && room.price) {
          score += pricePrefCount * 5;
        }
        if (typeof room.distance === 'number') {
          const km = room.distance / 1000;
          if (km <= 2) score += 20;
          else if (km <= 5) score += 10;
          else if (km <= 10) score += 5;
        }
        return { ...room, score };
      })
      .sort((a, b) => b.score - a.score);
  }
}
