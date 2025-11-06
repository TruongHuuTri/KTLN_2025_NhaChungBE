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
    this.redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST') as string,
      port: Number(this.configService.get<number>('REDIS_PORT')),
    });
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
    
    // Remove extra spaces and normalize
    let normalized = query.trim().replace(/\s+/g, ' ');
    
    // Remove common prefixes (stop words)
    const words = normalized.toLowerCase().split(/\s+/);
    const filtered = words.filter(w => !this.stopWords.has(w));
    
    if (filtered.length > 0) {
      normalized = filtered.join(' ');
    }
    
    return normalized.trim() || query.trim(); // Fallback to original if all filtered
  }

  // Extract ward name pattern like "phường <name>" (prefer code mapping over geocoding)
  private extractWardName(query: string): string | null {
    if (!query) return null;
    const m = query.toLowerCase().match(/phường\s+([\p{L}\s]+?)(?:\bquận|\bhuyện|\btp|\bthành phố|$)/u);
    if (m && m[1]) return m[1].trim();
    return null;
  }

  async search(query: string): Promise<any> {
    // Normalize query for consistent caching and parsing
    const normalizedQuery = this.normalizeQuery(query);
    const cacheKey = `search:nlp:${normalizedQuery.toLowerCase()}`;

    // 1. Kiểm tra cache
    const cachedResult = await this.redisClient.get(cacheKey);
    if (cachedResult) {
      this.logger.debug(`⚡️ Cache HIT for: ${normalizedQuery}`);
      return JSON.parse(cachedResult);
    }
    this.logger.debug(`🤔 Cache MISS! Processing query: ${normalizedQuery}`);

    // 1) Ưu tiên WardName/District → code; sau đó mới tới POI geocoding
    let params: SearchPostsParams | null = null;
    let aiSuccess = false;
    let poiHandled = false;
    let wardHandled = false;

    try {
      // Try resolve ward by name first (most precise, no geocoding)
      const wardName = this.extractWardName(normalizedQuery);
      if (wardName) {
        const resolved = this.geo.resolveWardByName(wardName);
        if (resolved) {
          params = this.heuristicParse(normalizedQuery);
          params.province_code = resolved.provinceCode;
          params.ward_code = [resolved.wardCode];
          wardHandled = true;
          this.logger.debug(`Ward detected: "${wardName}" -> wardCode=${resolved.wardCode}, province=${resolved.provinceCode}`);
        }
      }

      const poiNameEarly = this.extractPoiName(normalizedQuery);
      if (!wardHandled && poiNameEarly) {
        const coords = await this.geocodePoi(poiNameEarly.poiName, poiNameEarly.city);
        if (coords) {
          if (!params) params = this.heuristicParse(normalizedQuery);
          params.lat = coords.lat;
          params.lon = coords.lon;
          if (!params.distance) params.distance = '3km';
          poiHandled = true;
          this.logger.debug(`POI detected early: "${poiNameEarly.poiName}"${poiNameEarly.city ? ` (${poiNameEarly.city})` : ''} -> lat=${coords.lat}, lon=${coords.lon}, distance=${params.distance}`);
        }
      }
    } catch {}

    // Nếu chưa có ward/POI thì mới gọi AI để trích xuất tham số
    if (!wardHandled && !poiHandled) {
      try {
        this.logger.debug(`🤖 Attempting AI parse for: "${normalizedQuery}"`);
        params = await this.parseQueryWithAI(normalizedQuery);
        aiSuccess = true;
        this.logger.log(`✅ AI parsed successfully: ${JSON.stringify(params)}`);
      } catch (e) {
        this.logger.warn(`⚠️ AI parse failed, using heuristic fallback: ${e instanceof Error ? e.message : e}`);
        params = this.heuristicParse(normalizedQuery);
        this.logger.log(`✅ Heuristic parsed: ${JSON.stringify(params)}`);
      }
    }

    // 2) Post-process: Validate and enrich AI output with heuristic backup
    // This ensures we don't miss anything even if AI is incomplete
    // Ensure params is not null before enriching
    if (!params) {
      params = this.heuristicParse(normalizedQuery);
    }
    params = this.enrichParamsWithHeuristic(params, normalizedQuery);
    
    // CRITICAL: Map address fields from AI to ward_code (highest priority)
    // Priority: ward > district > city
    if (!wardHandled) {
      // If AI parsed ward name, resolve to ward_code
      if (params.ward) {
        const resolved = this.geo.resolveWardByName(params.ward);
        if (resolved) {
          params.province_code = resolved.provinceCode;
          params.ward_code = [resolved.wardCode];
          wardHandled = true;
          this.logger.debug(`AI ward parsed: "${params.ward}" -> wardCode=${resolved.wardCode}`);
        }
      }
      
      // If AI parsed district name, expand to ward codes
      if (!wardHandled && params.district) {
        const expanded = this.geo.expandDistrictAliasesToWardCodes(params.district);
        if (expanded && expanded.length) {
          params.ward_code = expanded;
          wardHandled = true;
          this.logger.debug(`AI district parsed: "${params.district}" -> ${expanded.length} ward codes`);
        }
      }
      
      // Fallback: try expand from query text if no ward/district from AI
      if (!wardHandled && params.q) {
        const expanded = this.geo.expandDistrictAliasesToWardCodes(params.q);
        if (expanded && expanded.length) {
          params.ward_code = expanded;
          this.logger.debug(`Expanded legacy districts from query to ${expanded.length} ward codes`);
        }
      }
    }
    
    // Ensure full-text search always has query text (fallback safety)
    if (!params.q || !params.q.trim()) {
      params.q = normalizedQuery;
    }

    // 2.1) Nếu chưa detect sớm, thử lần nữa (phòng khi AI/heuristic thay đổi text)
    if (!wardHandled && !poiHandled) {
      try {
        const poiInfo = this.extractPoiName(normalizedQuery);
        if (poiInfo) {
          const coords = await this.geocodePoi(poiInfo.poiName, poiInfo.city);
          if (coords) {
            params.lat = coords.lat;
            params.lon = coords.lon;
            if (!params.distance) params.distance = '3km';
            this.logger.debug(`POI detected: "${poiInfo.poiName}"${poiInfo.city ? ` (${poiInfo.city})` : ''} -> lat=${coords.lat}, lon=${coords.lon}, distance=${params.distance}`);
          }
        }
      } catch {}
    }

    // 2) Search ES with parsed params
    try {
      // DEBUG: Log parsed params để kiểm tra
      this.logger.debug(`🔍 ES search params: ${JSON.stringify({
        q: params.q?.substring(0, 50),
        category: params.category,
        postType: params.postType,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        hasAmenities: !!params.amenities?.length,
      })}`);
      
      const esResult = await this.searchService.searchPosts(params);
      
      // DEBUG: Log response để kiểm tra
      this.logger.debug(`ES search result: total=${esResult.total}, items=${esResult.items?.length || 0}`);
      
      if (esResult.items && esResult.items.length > 0) {
        const firstItem = esResult.items[0];
        this.logger.debug(`First item: category=${firstItem.category}, price=${firstItem.price}, title=${firstItem.title?.substring(0, 50)}`);
      } else {
        // DEBUG: Nếu không có results, log để debug
        this.logger.warn(`⚠️ No results found for query: "${normalizedQuery}" with params: ${JSON.stringify(params)}`);
      }
      
      await this.redisClient.set(cacheKey, JSON.stringify(esResult), 'EX', 3600);
      this.logger.log(`✅ ES search returned ${esResult.total} results`);
      return esResult;
    } catch (e) {
      this.logger.warn(`ES search failed, falling back to Mongo pipeline: ${e instanceof Error ? e.message : e}`);
    }

    // 3) Fallback to Gemini -> Mongo aggregation (only if ES fails)
    const aggregationPipeline = await this.getTextToAggregation(normalizedQuery);
    if (!aggregationPipeline || aggregationPipeline.length === 0) {
      this.logger.warn('Received empty pipeline from Gemini, returning empty result');
      return { items: [], total: 0, page: 1, limit: 20 };
    }

    const userId = 'user:123:prefs';
    await this.updateUserPreferences(userId, aggregationPipeline);

    const processedPipeline = await this.handleGeocoding(aggregationPipeline);
    let rawResultsFromDB: any[] = [];
    try {
      rawResultsFromDB = await this.roomModel.aggregate(processedPipeline).exec();
    } catch (err) {
      console.error('Aggregate execution error:', err);
      throw err;
    }

    const rankedResults = await this.rankResults(userId, rawResultsFromDB);
    await this.redisClient.set(cacheKey, JSON.stringify(rankedResults), 'EX', 3600);
    return rankedResults;
  }

  private async parseQueryWithAI(query: string): Promise<SearchPostsParams> {
    // Try different model names - Gemini API model names may vary
    // Based on @google/generative-ai v0.24.1 SDK
    // User confirmed model name: gemini-2.5-flash
    const modelNames = [
      'gemini-2.5-flash',        // Latest flash model (confirmed by user)
      'gemini-pro',              // Fallback: stable v1
      'gemini-1.5-pro',          // Fallback: v1.5 pro
      'gemini-1.5-flash',        // Fallback: v1.5 flash
    ];
    let model: GenerativeModel | null = null;
    let modelName = this.cachedWorkingModel || modelNames[0];
    let lastError: Error | null = null;
    
    // If we have a cached working model, try it first
    if (this.cachedWorkingModel) {
      try {
        model = this.genAI.getGenerativeModel({ model: this.cachedWorkingModel });
        modelName = this.cachedWorkingModel;
        this.logger.debug(`Using cached working model: ${this.cachedWorkingModel}`);
      } catch (e) {
        // Cache invalid, clear it
        const oldModel = this.cachedWorkingModel;
        this.cachedWorkingModel = null;
        this.logger.warn(`Cached model ${oldModel} failed, trying others...`);
      }
    }
    
    // If no cached model or cached failed, try all models
    if (!model) {
      for (const name of modelNames) {
        if (name === this.cachedWorkingModel) continue; // Skip already tried
        
        try {
          model = this.genAI.getGenerativeModel({ model: name });
          // Test with a minimal call to verify model works (only on first attempt)
          if (!this.cachedWorkingModel) {
            const testResult = await model.generateContent('Hi');
            await testResult.response;
            // Cache working model
            this.cachedWorkingModel = name;
            this.logger.log(`✅ Found working Gemini model: ${name} (cached for future use)`);
          }
          modelName = name;
          break;
        } catch (e: any) {
          lastError = e;
          const errorMsg = e?.message || e?.toString() || 'Unknown error';
          // Check if it's a 404 (model not found) vs other errors
          if (errorMsg.includes('404') || errorMsg.includes('not found')) {
            this.logger.debug(`Model ${name} not found (404), trying next...`);
          } else {
            this.logger.warn(`Model ${name} failed: ${errorMsg.substring(0, 100)}`);
          }
          continue;
        }
      }
    }
    
    if (!model) {
      const errorDetails = lastError ? `Last error: ${lastError.message?.substring(0, 200)}` : 'No model available';
      this.logger.error(`All Gemini models failed. ${errorDetails}`);
      this.logger.warn('⚠️ AI parsing disabled. System will use heuristic parsing only.');
      throw new Error(`Failed to initialize any Gemini model. Please check API key and model availability. ${errorDetails}`);
    }
    
    const prompt = `
Parse this Vietnamese real estate search query into JSON:

"${query}"

Return JSON with these fields (omit if not found):
{
  "q": "cleaned query text for full-text search",
  "postType": "rent" | "roommate" | null,
  "category": "phong-tro" | "chung-cu" | "nha-nguyen-can" | null,
  "gender": "male" | "female" | null,
  "minPrice": number (VND) | null,
  "maxPrice": number (VND) | null,
  "minArea": number (m2) | null,
  "maxArea": number (m2) | null,
  "district": string | null,
  "ward": string | null,
  "city": string | null,
  "amenities": ["amenity_key"] | null
}

Examples:
- "Tìm phòng chung cư tầm giá 6 triệu" → {"q": "phòng chung cư tầm giá 6 triệu", "postType": "rent", "category": "chung-cu", "minPrice": 5000000, "maxPrice": 7000000}
- "phòng trọ 3 triệu" → {"q": "phòng trọ 3 triệu", "postType": "rent", "category": "phong-tro", "minPrice": 2000000, "maxPrice": 4000000}
- "ở ghép nữ" → {"q": "ở ghép nữ", "postType": "roommate", "gender": "female"}

Price: "X triệu" = X * 1000000 VND. "tầm X triệu" = range (X-1) to (X+1) triệu.
Category: "chung cư"/"căn hộ" = "chung-cu", "phòng trọ" = "phong-tro", "nhà nguyên căn" = "nha-nguyen-can".
Amenities: map Vietnamese terms to keys (e.g., "ban công" → "ban_cong", "hồ bơi" → "ho_boi").

Return ONLY JSON, no markdown.
    `.trim();

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();
      text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/^[\s\n]*\{/, '{').replace(/\}[\s\n]*$/, '}');
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) text = jsonMatch[0];
      const parsed = JSON.parse(text);
      
      // Extract amenities from query if not in parsed response
      let extractedAmenities = parsed.amenities || [];
      if (!extractedAmenities || extractedAmenities.length === 0) {
        extractedAmenities = this.amenities.extractAmenities(query);
      }
      
      // Clean query text for better matching
      const cleanedQ = parsed.q ? this.normalizeQuery(parsed.q) : this.normalizeQuery(query);
      
      return {
        q: cleanedQ || query, // Fallback to original if cleaning removes everything
        postType: parsed.postType || undefined,
        category: parsed.category || undefined, // CRITICAL: Must include category
        gender: parsed.gender || undefined,
        minPrice: parsed.minPrice || undefined,
        maxPrice: parsed.maxPrice || undefined,
        minArea: parsed.minArea || undefined,
        maxArea: parsed.maxArea || undefined,
        district: parsed.district || undefined,
        ward: parsed.ward || undefined,
        city: parsed.city || undefined,
        amenities: extractedAmenities.length > 0 ? extractedAmenities : undefined,
      };
    } catch (error: any) {
      this.logger.error(`AI parse error: ${error?.message || error}`);
      throw error;
    }
  }

  /**
   * Enrich AI-parsed params with heuristic backup to ensure completeness
   * This fills in any gaps that AI might have missed
   */
  private enrichParamsWithHeuristic(aiParams: SearchPostsParams, originalQuery: string): SearchPostsParams {
    const heuristicParams = this.heuristicParse(originalQuery);
    
    // Merge: AI params take priority, but fill in missing fields from heuristic
    const enriched: SearchPostsParams = { ...aiParams };
    
    // If AI didn't extract category but heuristic did, use heuristic
    if (!enriched.category && heuristicParams.category) {
      enriched.category = heuristicParams.category;
      this.logger.debug(`Enriched: Added category from heuristic: ${heuristicParams.category}`);
    }
    
    // If AI didn't extract postType but heuristic did, use heuristic
    if (!enriched.postType && heuristicParams.postType) {
      enriched.postType = heuristicParams.postType;
      this.logger.debug(`Enriched: Added postType from heuristic: ${heuristicParams.postType}`);
    }
    
    // If AI didn't extract price range but heuristic did, use heuristic
    if (!enriched.minPrice && !enriched.maxPrice && (heuristicParams.minPrice || heuristicParams.maxPrice)) {
      enriched.minPrice = heuristicParams.minPrice;
      enriched.maxPrice = heuristicParams.maxPrice;
      this.logger.debug(`Enriched: Added price range from heuristic`);
    }
    
    // If AI didn't extract gender but heuristic did, use heuristic
    if (!enriched.gender && heuristicParams.gender) {
      enriched.gender = heuristicParams.gender;
      this.logger.debug(`Enriched: Added gender from heuristic: ${heuristicParams.gender}`);
    }
    
    // Merge amenities (union, not replacement)
    if (heuristicParams.amenities && heuristicParams.amenities.length > 0) {
      const existing = enriched.amenities || [];
      const merged = [...new Set([...existing, ...heuristicParams.amenities])];
      if (merged.length > existing.length) {
        enriched.amenities = merged;
        this.logger.debug(`Enriched: Added amenities from heuristic`);
      }
    }
    
    // Ensure query text is preserved (use AI's cleaned version if available, else heuristic, else original)
    enriched.q = enriched.q || heuristicParams.q || originalQuery;
    
    return enriched;
  }

  private heuristicParse(q: string): SearchPostsParams {
    const text = q.toLowerCase();
    const params: SearchPostsParams = {};

    // CRITICAL: Detect category FIRST (before generic postType)
    // Priority order: specific categories > roommate > generic rent
    if (text.includes('chung cư') || text.includes('chung cu') || text.includes('căn hộ') || text.includes('can ho')) {
      params.postType = 'rent';
      params.category = 'chung-cu';
    } else if (text.includes('phòng trọ') || text.includes('phong tro')) {
      params.postType = 'rent';
      params.category = 'phong-tro';
    } else if (text.includes('nhà nguyên căn') || text.includes('nha nguyen can')) {
      params.postType = 'rent';
      params.category = 'nha-nguyen-can';
    } else if (text.includes('o ghep') || text.includes('ở ghép') || text.includes('oghep') || text.includes('roommate')) {
      params.postType = 'roommate';
      // No category for roommate
    } else if (
      text.includes('cho thue') || text.includes('cho thuê') || 
      text.includes('thuê phòng') || text.includes('rent')
    ) {
      params.postType = 'rent';
      // Generic rent, no specific category
    }

    // Detect gender
    if (text.includes('nu') || text.includes('nữ') || text.includes('female')) {
      params.gender = 'female';
    } else if (text.includes('nam') || text.includes('male')) {
      params.gender = 'male';
    }

    // Comprehensive price extraction - handle ALL patterns
    // IMPORTANT: Check for ANY number followed by "triệu" anywhere in query
    // Pattern 1: "tầm X triệu" or "tam X trieu" or "khoảng X triệu" → range around X
    let priceMatch = text.match(/(tam|tầm|khoang|khoảng)\s*(gia|giá)?\s*(\d+(?:[\.,]\d+)*)\s*(trieu|triệu)/);
    if (priceMatch) {
      const num = Number(priceMatch[3].replace(/\./g, '').replace(/,/g, ''));
      if (!isNaN(num) && num > 0) {
        // "tầm 6 triệu" → range 5-7 triệu (flexible range ±1 triệu)
        params.minPrice = Math.max(0, (num - 1) * 1_000_000);
        params.maxPrice = (num + 1) * 1_000_000;
        this.logger.debug(`💵 Price extracted (tầm): ${num} triệu → ${params.minPrice}-${params.maxPrice} VND`);
      }
    } else {
      // Pattern 2: "dưới X triệu"
      priceMatch = text.match(/(duoi|dưới)\s*(\d+(?:[\.,]\d+)*)\s*(trieu|triệu)/);
      if (priceMatch) {
        const num = Number(priceMatch[2].replace(/\./g, '').replace(/,/g, ''));
        if (!isNaN(num) && num > 0) {
          params.maxPrice = num * 1_000_000;
          this.logger.debug(`💵 Price extracted (dưới): ${num} triệu → max ${params.maxPrice} VND`);
        }
      } else {
        // Pattern 3: "trên X triệu" or "từ X triệu"
        priceMatch = text.match(/(tren|trên|tu|từ)\s+(\d+(?:[\.,]\d+)*)\s*(trieu|triệu)/);
        if (priceMatch) {
          const num = Number(priceMatch[2].replace(/\./g, '').replace(/,/g, ''));
          if (!isNaN(num) && num > 0) {
            params.minPrice = num * 1_000_000;
            this.logger.debug(`💵 Price extracted (trên/từ): ${num} triệu → min ${params.minPrice} VND`);
          }
        } else {
          // Pattern 4: "X triệu" (ANYWHERE in query, not just standalone)
          // This is more flexible - catches "chung cư 6 triệu", "5 triệu", "phòng 3 triệu"
          priceMatch = text.match(/(\d+(?:[\.,]\d+)*)\s*(trieu|triệu)/);
          if (priceMatch) {
            const num = Number(priceMatch[1].replace(/\./g, '').replace(/,/g, ''));
            if (!isNaN(num) && num > 0) {
              // Treat as range around X (flexible) - widen range for better matching
              // "5 triệu" → 4-7 triệu (more flexible than ±1)
              params.minPrice = Math.max(0, (num - 2) * 1_000_000); // Allow 2 triệu below
              params.maxPrice = (num + 2) * 1_000_000; // Allow 2 triệu above
              this.logger.debug(`💵 Price extracted (X triệu): ${num} triệu → ${params.minPrice}-${params.maxPrice} VND`);
            }
          }
        }
      }
    }

    // Pattern 5: "từ X đến Y triệu" (overrides previous if found)
    const rangeMatch = text.match(/(tu|từ)\s*(\d+(?:[\.,]\d+)*)\s*(den|đến)\s*(\d+(?:[\.,]\d+)*)\s*(trieu|triệu)/);
    if (rangeMatch) {
      const min = Number(rangeMatch[2].replace(/\./g, '').replace(/,/g, ''));
      const max = Number(rangeMatch[4].replace(/\./g, '').replace(/,/g, ''));
      if (!isNaN(min) && min > 0) params.minPrice = min * 1_000_000;
      if (!isNaN(max) && max > 0 && max >= min) params.maxPrice = max * 1_000_000;
    }

    // Area extraction
    const areaMatch = text.match(/(?:dien|diện)\s*(?:tich|tích)?\s*(tren|trên|duoi|dưới)?\s*(\d+(?:[\.,]\d+)*)\s*m2/);
    if (areaMatch) {
      const area = Number(areaMatch[2].replace(/\./g, '').replace(/,/g, ''));
      if (!isNaN(area) && area > 0) {
        if (areaMatch[1] === 'tren' || areaMatch[1] === 'trên') {
          params.minArea = area;
        } else if (areaMatch[1] === 'duoi' || areaMatch[1] === 'dưới') {
          params.maxArea = area;
        } else {
          // Approximate range
          params.minArea = Math.max(0, area - 5);
          params.maxArea = area + 5;
        }
      }
    }

    // Clean query for full-text search
    const cleanedQ = this.normalizeQuery(q);
    params.q = cleanedQ || q; // Fallback to original
    
    // Extract amenities from query
    const extractedAmenities = this.amenities.extractAmenities(q);
    if (extractedAmenities.length > 0) {
      params.amenities = extractedAmenities;
    }
    
    return params;
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
