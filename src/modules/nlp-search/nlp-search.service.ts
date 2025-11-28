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
    this.redisClient.on('connect', () => console.log('✅ Connected to Redis'));
    this.redisClient.on('error', (err) => console.error('❌ Redis Client Error', err));

    const options: NodeGeocoder.Options = {
      provider: 'mapbox',
      apiKey: this.configService.get<string>('MAPBOX_API_KEY') as string,
    };
    this.geocoder = NodeGeocoder(options);
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
    if (tokens.length > 14) return false;
    const complexWords = ['gần', 'bán kính', 'trong vòng', 'mới đăng', 'gần trường', 'gần chợ'];
    if (complexWords.some(w => text.includes(w))) return false;
    const hasPrice = /\d+([.,]\d+)?\s*(trieu|triệu|tr|vnđ|vnd)/.test(text) || /\b\d{6,9}\b/.test(text);
    const hasCategoryWord = text.includes('phòng trọ') || text.includes('chung cư') || text.includes('căn hộ') || text.includes('nhà nguyên căn');
    const hasDistrictHint = text.includes('quận') || text.includes('huyện') || text.includes('q.');
    return hasPrice || hasCategoryWord || hasDistrictHint;
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
      (p as any).minCreatedAt = parsed.minCreatedAt;
    }
    return p;
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

  async search(q: string) {
    const normalized = this.normalizeQuery(q);
    const cacheKey = `search:nlp:v3:${normalized}`;
    const cached = await this.redisClient.get(cacheKey);
    if (cached) {
      this.logger.debug(`⚡️ Cache HIT for: ${normalized}`);
      return JSON.parse(cached);
    }
    this.logger.debug(`🤔 Cache MISS! Processing query: ${normalized}`);

    let parsed: ParsedNlpQuery | null;
    if (this.isSimpleQuery(normalized)) {
      this.logger.debug(`Simple query detected, using heuristic parser (FAST)`);
      parsed = this.heuristicParse(q);
    } else {
      this.logger.debug(`Complex query detected, using AI parser (SMART)`);
      const aiParsed = await this.aiParse(q);
      parsed = aiParsed || this.heuristicParse(q);
    }

    parsed = this.enrichLocationWithCodes(parsed);

    const poiInfo = this.extractPoiName(q);
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
    const result = await this.searchService.searchPosts(params);

    await this.redisClient.set(cacheKey, JSON.stringify(result), 'EX', 3600);
    this.logger.log(`✅ Search completed: ${result.total} results`);
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
      const result = await model.generateContent(prompt);
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

    if (text.includes('chung cư') || text.includes('căn hộ')) result.category = 'chung-cu';
    else if (text.includes('phòng trọ')) result.category = 'phong-tro';
    else if (text.includes('nhà nguyên căn') || text.includes('nguyên căn')) result.category = 'nha-nguyen-can';

    result.postType = (text.includes('ở ghép') || text.includes('o ghep')) ? 'roommate' : 'rent';

    const priceMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(trieu|triệu|tr)/) || text.match(/(\d{6,9})\s*(vnd|vnđ)?/);
    if (priceMatch) {
      let value = parseFloat(priceMatch[1].replace(',', '.'));
      if (value < 1000) value *= 1_000_000;
      const delta = value * 0.15;
      result.minPrice = Math.max(0, value - delta);
      result.maxPrice = value + delta;
    }

    const districtMatch = text.match(/quận\s+([a-z0-9\s]+)/);
    if (districtMatch) result.district = districtMatch[1].trim();

    // --- START: Heuristic cho các trường mới ---
    const bedroomsMatch = text.match(/(\d+)\s*(phong ngu|pn)/);
    if (bedroomsMatch) result.minBedrooms = parseInt(bedroomsMatch[1], 10);

    const bathroomsMatch = text.match(/(\d+)\s*(phong tam|pt|wc)/);
    if (bathroomsMatch) result.minBathrooms = parseInt(bathroomsMatch[1], 10);

    if (text.includes('full nội thất') || text.includes('đầy đủ nội thất')) result.furniture = 'full';
    else if (text.includes('nội thất cơ bản')) result.furniture = 'basic';
    else if (text.includes('không nội thất') || text.includes('phòng trống')) result.furniture = 'none';

    if (text.includes('sổ hồng') || text.includes('so hong')) result.legalStatus = 'co-so-hong';
    // --- END: Heuristic cho các trường mới ---

    result.amenities = this.amenities.extractAmenities(q);
    return result;
  }
}
