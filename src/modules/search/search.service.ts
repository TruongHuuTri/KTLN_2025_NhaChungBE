import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { GeoCodeService } from './geo-code.service';
import { AmenitiesService } from './amenities.service';
import { EmbeddingService } from './embedding.service';

// Mở rộng SearchPostsParams để hỗ trợ filter mới và soft ranking
export type SearchPostsParams = {
  q?: string;
  city?: string;
  district?: string;
  ward?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  lat?: number;
  lon?: number;
  distance?: string; // e.g. "3km"
  page?: number;
  limit?: number;
  prefetch?: number; // số trang preload tiếp theo (0-3)
  sort?: 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'nearest';
  // Lưu ý: postType trong index dùng 'cho-thue' | 'tim-o-ghep'
  // Chấp nhận thêm alias cũ ('rent' | 'roommate') để tương thích input
  postType?: 'cho-thue' | 'tim-o-ghep' | 'rent' | 'roommate';
  gender?: 'male' | 'female' | 'any';
  province_code?: string;
  district_code?: string | string[]; // DEPRECATED: Không dùng vì mapping chỉ là helper, không có districtCodes thực sự
  ward_code?: string | string[];
  roommate?: boolean;
  searcherGender?: 'male' | 'female';
  amenities?: string[];
  excludeAmenities?: string[];
  excludeDistricts?: string[];
  category?: string; // "phong-tro", "chung-cu", "nha-nguyen-can"
  poiKeywords?: string[];
  boostAmenities?: string[]; // amenity keys for boosting only (no exact filter)

  // --- START: Các trường filter mới ---
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  furniture?: string; // 'full', 'basic', 'none'
  legalStatus?: string; // 'co-so-hong', 'cho-so'
  propertyType?: string;
  buildingName?: string;
  // --- END: Các trường filter mới ---

  // --- START: Tham số điều khiển soft ranking ---
  strict?: boolean; // Nếu true, không nới lỏng điều kiện tìm kiếm
  minResults?: number; // Số kết quả tối thiểu mong muốn
  // --- END: Tham số điều khiển soft ranking ---

  // --- START: Các trường bổ sung từ NLP/Personalization ---
  /**
   * So sánh mức giá tương đối (ví dụ: \"phòng rẻ hơn\", \"phòng cao cấp\")
   * Được set bởi NLP parser, dùng để build range price tương đối.
   */
  priceComparison?: 'cheaper' | 'more_expensive';

  /**
   * Giới hạn thời gian đăng tin từ NLP parser (ISO string).
   * Ví dụ: \"tin mới đăng 7 ngày gần đây\".
   */
  minCreatedAt?: string;

  /**
   * UserId phục vụ personalization (sau dùng cho UserPreferenceService).
   */
  userId?: number;
  /**
   * Chế độ search (dùng cho thử nghiệm hybrid sau này).
   * - 'bm25': chỉ dùng BM25 + function_score (mặc định hiện tại).
   * - 'hybrid': BM25 + vector + RRF (nếu được gọi qua endpoint riêng).
   */
  mode?: 'bm25' | 'hybrid';
  // --- END: Các trường bổ sung từ NLP/Personalization ---
};

@Injectable()
export class SearchService {
  private readonly index: string;

  constructor(
    @Inject('ES_CLIENT') private readonly es: Client,
    private readonly cfg: ConfigService,
    private readonly geo: GeoCodeService,
    private readonly amenities: AmenitiesService,
    private readonly embeddingService: EmbeddingService,
  ) {
    this.index = this.cfg.get<string>('ELASTIC_INDEX_POSTS') || 'posts';
  }

  /**
   * Helper: Extract total hits từ ES response (hỗ trợ cả ES 7.x và 8.x format).
   */
  private extractTotalHits(resp: any): number {
    if (
      typeof resp.hits?.total === 'object' &&
      resp.hits.total?.value != null
    ) {
      return resp.hits.total.value;
    }
    return typeof resp.hits?.total === 'number' ? resp.hits.total : 0;
  }

  // Cập nhật buildResponseItem để trả về các trường dữ liệu mới
  private buildResponseItem(h: any) {
    const source = h._source || {};
    const highlight = h.highlight || {};

    const cleanHighlight: Record<string, string[]> = {};
    const allowedKeys = ['title', 'description', 'address', 'buildingName'];
    Object.keys(highlight).forEach((key) => {
      if (allowedKeys.some((allowed) => key.includes(allowed))) {
        const values = Array.isArray(highlight[key])
          ? highlight[key]
          : [highlight[key]];
        const filtered = values.filter((val: string) => {
          const trimmed = val.replace(/<em>.*?<\/em>/g, '').trim();
          return trimmed.length > 3;
        });
        if (filtered.length > 0) {
          cleanHighlight[key] = filtered;
        }
      }
    });

    return {
      id: h._id,
      score: h._score,
      postId: source.postId,
      roomId: source.roomId,
      title: source.title,
      description: source.description, // Giữ description gốc để hiển thị
      category: source.category,
      type: source.type,
      price: source.price,
      area: source.area,
      address: source.address,
      images: source.images || [],
      coords: source.coords,
      createdAt: source.createdAt,
      // --- START: Trả về các trường mới ---
      bedrooms: source.bedrooms,
      bathrooms: source.bathrooms,
      furniture: source.furniture,
      legalStatus: source.legalStatus,
      propertyType: source.propertyType,
      buildingName: source.buildingName,
      blockOrTower: source.blockOrTower,
      floorNumber: source.floorNumber,
      direction: source.direction,
      totalFloors: source.totalFloors,
      landArea: source.landArea,
      usableArea: source.usableArea,
      deposit: source.deposit,
      postDescription: source.postDescription,
      roomDescription: source.roomDescription,
      amenities: source.amenities || [],
      // --- END: Trả về các trường mới ---
      ...(Object.keys(cleanHighlight).length > 0 && {
        highlight: cleanHighlight,
      }),
    };
  }

  async searchPosts(p: SearchPostsParams) {
    const page = Math.max(1, Number(p.page) || 1);
    // Nếu không có limit hoặc limit = 0, trả về tất cả (tối đa 200 để tránh performance issue)
    const requestedLimit = Number(p.limit);
    const pageSize =
      requestedLimit === 0 || !requestedLimit
        ? 200
        : Math.min(200, Math.max(1, requestedLimit));
    let debugHybrid = false;
    const phaseAttempts: {
      phase: string;
      tookMs: number;
      hits: number;
      filters: number;
      functions: number;
    }[] = [];
    // Mặc định preload thêm 3 trang (4 trang tổng cộng) nếu FE không truyền prefetch
    const rawPrefetch = p.prefetch ?? 3;
    const prefetch = Math.max(0, Math.min(3, Number(rawPrefetch) || 0));
    const from = (page - 1) * pageSize;
    const minResults = p.minResults ?? Math.ceil(pageSize * 1.5); // giảm relax threshold để bớt nới lỏng
    // Nếu không có limit, lấy tất cả (tối đa 200)
    const size =
      requestedLimit === 0 || !requestedLimit
        ? 200
        : Math.min(200, pageSize * (1 + prefetch));

    const derivePriceTarget = () => {
      // Nếu đã có min/max thì dùng chúng
      if (p.minPrice != null || p.maxPrice != null) {
        const tgt =
          p.minPrice != null && p.maxPrice != null
            ? (p.minPrice + p.maxPrice) / 2
            : p.minPrice != null
              ? p.minPrice
              : p.maxPrice;
        return tgt || null;
      }
      if (!p.q) return null;
      const text = p.q.toLowerCase();
      const trToVnd = (v: number) => (v < 1000 ? v * 1_000_000 : v);
      const parseTrNum = (s: string) => {
        const m = s.match(/^(\d+)\s*tr\s*(\d+)$/i);
        if (m) return Number(m[1]) + Number(m[2]) / 10;
        return Number(s.replace(',', '.'));
      };
      const range = text.match(
        /(?:từ\s*)?(\d+(?:[.,]\d+)?(?:\s*tr)?)\s*(?:triệu|tr|m)?\s*(?:đến|to|-|~)\s*(\d+(?:[.,]\d+)?(?:\s*tr)?)\s*(?:triệu|tr|m|triệu\s*đồng)?/i,
      );
      if (range) {
        const min = trToVnd(parseTrNum(range[1].replace(/\s*tr/i, '')));
        const max = trToVnd(parseTrNum(range[2].replace(/\s*tr/i, '')));
        return (min + max) / 2;
      }
      const m6tr5 = text.match(/(\d+)\s*tr\s*(\d+)/i);
      const mUnit = text.match(
        /(\d+(?:[.,]\d+)?)\s*(triệu|tr|m|triệu\s*đồng)(?:\s*\/\s*tháng)?/i,
      );
      const mRawDot = text.match(/(\d{1,3}(?:[.,]\d{3}){2,})/);
      const mRaw = text.match(/\b(\d{6,9})\b/);
      const mLoose = text.match(/\b(\d{1,2}(?:[.,]\d+)?)\b/);
      let value: number | undefined;
      if (m6tr5) value = trToVnd(Number(m6tr5[1]) + Number(m6tr5[2]) / 10);
      else if (mUnit) value = trToVnd(Number(mUnit[1].replace(',', '.')));
      else if (mRawDot) value = Number(mRawDot[1].replace(/[.,]/g, ''));
      else if (mRaw) value = Number(mRaw[1]);
      else if (
        mLoose &&
        Number(mLoose[1].replace(',', '.')) > 0 &&
        Number(mLoose[1].replace(',', '.')) <= 30 &&
        /(triệu|tr|m|giá|thue|thuê|gia)/i.test(text)
      ) {
        value = trToVnd(Number(mLoose[1].replace(',', '.')));
      }
      return value || null;
    };
    // Helper: build các đoạn text-boost cho tiện ích (không cần field amenities)
    // Ưu tiên check thẳng vào description với boost cao
    const buildAmenityTextShould = (amenityKeys: string[] = []) =>
      amenityKeys
        .map((amenityKey) => {
          const keywords = this.amenities.getAmenityKeywords(amenityKey);
          if (keywords.length === 0) return null;
          return {
            bool: {
              should: keywords.flatMap((keyword) => [
                // Match phrase trong description (chính xác hơn)
                {
                  match_phrase: {
                    roomDescription: { query: keyword, boost: 6.0 },
                  },
                },
                {
                  match_phrase: {
                    postDescription: { query: keyword, boost: 5.0 },
                  },
                },
                // Multi-match cho các field khác
                {
                  multi_match: {
                    query: keyword,
                    type: 'best_fields',
                    fields: [
                      'roomDescription.raw^5',
                      'postDescription.raw^4',
                      'title.raw^3',
                      'roomDescription.fold^3',
                      'postDescription.fold^2',
                      'title.ng^2',
                    ],
                    fuzziness: 'AUTO',
                  },
                },
              ]),
              minimum_should_match: 1,
            },
          };
        })
        .filter(Boolean);

    // Suy luận ưu tiên loại hình khi chỉ có từ "phòng" (không nêu rõ chung cư/nhà)
    const inferredCategoryBoosts: string[] = [];
    if (!p.category) {
      const qText = (p.q || '').toLowerCase();
      const hasGenericRoom = /\bphòng\b/.test(qText);
      const hasExplicitOther =
        /chung\s*c[ưu]|căn\s*hộ|cc|nhà\s*nguyên\s*căn|nguyên\s*căn/i.test(
          qText,
        );
      if (hasGenericRoom && !hasExplicitOther) {
        inferredCategoryBoosts.push('phong-tro', 'chung-cu');
      }
    }

    const priceTarget = derivePriceTarget();
    // Nếu query chỉ nói chung chung "phòng" (không nêu loại, không giá) thì ưu tiên tầm giá thấp để đẩy nhà nguyên căn xuống
    const effectivePriceTarget =
      priceTarget ||
      (inferredCategoryBoosts.length > 0 ? 5_000_000 : undefined);

    const hasRoommateKeywordInQuery = (text?: string) => {
      if (!text) return false;
      return /ở\s*g(h|kh)e?p|o\s*g(h|kh)e?p|share\s*phòng|ở chung/i.test(text);
    };

    const normalizePostType = (value?: string) => {
      if (!value) return undefined;
      const v = value.toLowerCase();
      if (['rent', 'cho-thue', 'chothue', 'rent_post'].includes(v))
        return 'cho-thue';
      if (['roommate', 'tim-o-ghep', 'o-ghep', 'timoghep'].includes(v))
        return 'tim-o-ghep';
      return value;
    };
    // Nếu query có keyword ở ghép mà postType chưa set, ép sang tim-o-ghep
    if (!p.postType && hasRoommateKeywordInQuery(p.q)) {
      p.postType = 'tim-o-ghep';
    }
    const normalizedPostType = normalizePostType(p.postType);
    let effectivePostType = normalizedPostType;
    const isRoommateQueryGlobal =
      effectivePostType === 'tim-o-ghep' ||
      p.roommate === true ||
      hasRoommateKeywordInQuery(p.q);
    if (isRoommateQueryGlobal) {
      effectivePostType = 'tim-o-ghep';
    }

    const roommateTextClauses = [
      { match_phrase: { title: 'ở ghép' } },
      { match_phrase: { roomDescription: 'ở ghép' } },
      { match_phrase: { postDescription: 'ở ghép' } },
      { match_phrase: { title: 'o ghep' } },
      { match_phrase: { roomDescription: 'o ghep' } },
      { match_phrase: { postDescription: 'o ghep' } },
    ];

    const applyRoommateFilters = (filterArr: any[]) => filterArr;

    // --- 1. Xây dựng Query cơ bản (Text Search) ---
    const must: any[] = [];
    // Giữ mềm: không ép must cho ở ghép/cho thuê, chỉ dùng boost/phạt bên function_score

    if (p.q && p.q.trim()) {
      must.push({
        multi_match: {
          query: p.q,
          type: 'most_fields',
          fields: [
            'address.full.raw^6',
            'address.full.fold^5',
            'buildingName.raw^5',
            'buildingName.fold^4',
            'title.raw^3',
            'title.fold^2.5',
            'title.ng^2',
            'roomDescription.raw^3',
            'roomDescription.fold^2.5',
            'postDescription.raw^2',
            'postDescription.fold^1.5',
          ],
          fuzziness: 'AUTO',
          operator: 'or',
        },
      });
    }

    // Boost POI keywords trong title/description (boost cao cho demo thuyết trình)
    if (p.poiKeywords && p.poiKeywords.length > 0) {
      const poiQueries = p.poiKeywords.map((poiName) => ({
        multi_match: {
          query: poiName,
          type: 'best_fields',
          fields: [
            'title.raw^8',
            'roomDescription.raw^7',
            'postDescription.raw^6',
            'title.ng^5',
            'roomDescription.fold^4',
            'postDescription.fold^3',
            'address.full.raw^3',
          ],
          fuzziness: 'AUTO',
        },
      }));
      must.push({
        bool: { should: poiQueries, minimum_should_match: 1, boost: 4.5 },
      });
    }

    // Boost amenities trong text (ưu tiên cao cho demo thuyết trình)
    if ((!p.amenities || p.amenities.length === 0) && p.q) {
      p.amenities = this.amenities.extractAmenities(p.q);
    }
    const amenityList = p.amenities || [];
    const amenityQueries = buildAmenityTextShould(amenityList);
    if (amenityQueries.length > 0) {
      // Boost mạnh hơn để các bài khớp nhiều tiện ích lên trên
      const amenityBoost = 3 + 0.7 * Math.max(0, amenityList.length - 1);
      must.push({
        bool: {
          should: amenityQueries,
          minimum_should_match: 1,
          boost: amenityBoost,
        },
      });
    }

    // Boost personalization amenities (text-based, không cần field amenities)
    const boostAmenityQueries = buildAmenityTextShould(p.boostAmenities || []);
    if (boostAmenityQueries.length > 0) {
      must.push({
        bool: {
          should: boostAmenityQueries,
          minimum_should_match: 1,
          boost: 1.2,
        },
      });
    }

    // --- 2. Xây dựng các Filter ban đầu (Strict) ---
    const buildFilters = (isStrict = true, currentWardCodes: string[] = []) => {
      const filter: any[] = [
        { term: { status: 'active' } },
        { term: { isActive: true } },
      ];

      const isRoommateQuery =
        normalizedPostType === 'tim-o-ghep' ||
        p.roommate === true ||
        hasRoommateKeywordInQuery(p.q);
      if (isRoommateQuery) {
        effectivePostType = 'tim-o-ghep';
      }

      const roommateExclusion = {
        bool: {
          should: [
            { term: { type: 'tim-o-ghep' } },
            { term: { postType: 'tim-o-ghep' } },
            { match_phrase: { title: 'ở ghép' } },
            { match_phrase: { title: 'o ghep' } },
            { match_phrase: { roomDescription: 'ở ghép' } },
            { match_phrase: { roomDescription: 'o ghep' } },
            { match_phrase: { postDescription: 'ở ghép' } },
            { match_phrase: { postDescription: 'o ghep' } },
          ],
          minimum_should_match: 1,
        },
      };

      if (effectivePostType) {
        filter.push({
          bool: {
            should: [
              { term: { type: effectivePostType } },
              { term: { postType: effectivePostType } },
            ],
            minimum_should_match: 1,
          },
        });
      }
      // Áp dụng filter roommate/cho-thue theo intent
      applyRoommateFilters(filter);
      // Chốt chặn bổ sung: nếu query ở ghép hoặc effectivePostType là tim-o-ghep thì bắt buộc must tim-o-ghep, must_not cho-thue
      const hardRoommate =
        effectivePostType === 'tim-o-ghep' ||
        p.roommate === true ||
        hasRoommateKeywordInQuery(p.q);
      if (hardRoommate) {
        filter.push({
          bool: {
            must: [
              {
                bool: {
                  should: [
                    { term: { type: 'tim-o-ghep' } },
                    { term: { postType: 'tim-o-ghep' } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            must_not: [
              { term: { type: 'cho-thue' } },
              { term: { postType: 'cho-thue' } },
            ],
          },
        });
      }
      if (p.province_code) {
        filter.push({ term: { 'address.provinceCode': p.province_code } });
      }
      if (currentWardCodes.length > 0) {
        filter.push({ terms: { 'address.wardCode': currentWardCodes } });
      } else if (expandedWardCodes.length > 0) {
        // Nếu chưa có ward_code nhưng có district → dùng wardCodes của quận đó
        filter.push({ terms: { 'address.wardCode': expandedWardCodes } });
      }

      // Search mềm: KHÔNG filter cứng category, chỉ boost qua function_score
      // Category sẽ được boost trong buildFunctions (weight cao cho category yêu cầu, thấp cho category khác)

      // Filters cho các trường mới
      if (p.minBedrooms != null || p.maxBedrooms != null) {
        filter.push({
          range: { bedrooms: { gte: p.minBedrooms, lte: p.maxBedrooms } },
        });
      }
      if (p.minBathrooms != null || p.maxBathrooms != null) {
        filter.push({
          range: { bathrooms: { gte: p.minBathrooms, lte: p.maxBathrooms } },
        });
      }
      if (p.furniture) filter.push({ term: { furniture: p.furniture } });
      if (p.legalStatus) filter.push({ term: { legalStatus: p.legalStatus } });
      if (p.propertyType)
        filter.push({ term: { propertyType: p.propertyType } });

      // Nếu có toạ độ từ POI → lọc bán kính để tránh tràn kết quả xa (soft nhưng hợp ngữ cảnh)
      if (p.lat != null && p.lon != null) {
        // Khoảng cách mặc định 3km; nếu user/POI có distance thì dùng distance đó
        const maxDistance = p.distance || '3km';
        filter.push({
          geo_distance: {
            distance: maxDistance,
            coords: `${p.lat},${p.lon}`,
          },
        });
      }

      // Filter buildingName:
      // - Nếu buildingName xuất hiện trong query text → chỉ dùng text search (multi_match)
      // - Nếu buildingName được truyền riêng (không có trong query) → dùng exact filter
      if (p.buildingName && p.buildingName.trim()) {
        const buildingNameLower = p.buildingName.toLowerCase().trim();
        const queryText = (p.q || '').toLowerCase();
        // Nếu buildingName không xuất hiện trong query text → dùng exact filter
        if (!queryText.includes(buildingNameLower)) {
          filter.push({ term: { 'buildingName.kwd': buildingNameLower } });
        }
        // Nếu có trong query text, multi_match đã xử lý trong must (không cần filter thêm)
      }

      // Các filter cũ
      if (p.minPrice != null || p.maxPrice != null) {
        filter.push({ range: { price: { gte: p.minPrice, lte: p.maxPrice } } });
      } else if (p.priceComparison) {
        // Price comparison mode: cheaper hoặc more_expensive
        const priceFilter: any = {};
        if (p.priceComparison === 'cheaper') {
          priceFilter.lte = 5_000_000; // Dưới 5 triệu
        } else if (p.priceComparison === 'more_expensive') {
          priceFilter.gte = 10_000_000; // Trên 10 triệu
        }
        if (Object.keys(priceFilter).length > 0) {
          filter.push({ range: { price: priceFilter } });
        }
      }

      // Thời gian đăng (từ NLP parsing)
      if (p.minCreatedAt) {
        filter.push({ range: { createdAt: { gte: p.minCreatedAt } } });
      }
      if (p.minArea != null || p.maxArea != null) {
        filter.push({ range: { area: { gte: p.minArea, lte: p.maxArea } } });
      }
      if (p.lat != null && p.lon != null && p.distance) {
        filter.push({
          geo_distance: {
            distance: p.distance,
            coords: { lat: p.lat, lon: p.lon },
          },
        });
      }

      // Exclude districts
      if (p.excludeDistricts && p.excludeDistricts.length > 0) {
        const excludeDistrictCodes: string[] = [];
        for (const districtName of p.excludeDistricts) {
          const codes = this.geo.expandDistrictAliasesToWardCodes(districtName);
          if (codes) excludeDistrictCodes.push(...codes);
        }
        if (excludeDistrictCodes.length > 0) {
          filter.push({
            bool: {
              must_not: { terms: { 'address.wardCode': excludeDistrictCodes } },
            },
          });
        }
      }

      // Roommate gender filter
      if (
        normalizedPostType === 'tim-o-ghep' &&
        p.gender &&
        p.gender !== 'any'
      ) {
        filter.push({ term: { gender: p.gender } });
      }

      return filter;
    };

    // --- 3. Xây dựng Function Score (Ranking Tiers) ---
    const toArr = (v?: string | string[]) =>
      Array.isArray(v) ? v : v ? [v] : [];
    // District hint fallback từ query text
    let districtName = p.district;
    if (!districtName && p.q) {
      const m =
        p.q.match(/\bq\.?\s*(\d{1,2})\b/i) ||
        p.q.match(/\bquận\s*(\d{1,2})\b/i) ||
        p.q.match(/\bdistrict\s*(\d{1,2})\b/i);
      if (m && m[1]) districtName = `quận ${m[1]}`;
      if (!districtName) {
        const detected = this.geo.detectDistrictFromText(p.q);
        if (detected) districtName = detected.alias;
      }
    }

    let exactWardCodes = toArr(p.ward_code);
    // Nếu không có ward_code nhưng có district name, convert district -> wardCodes
    if (exactWardCodes.length === 0 && districtName) {
      const districtWardCodes =
        this.geo.expandDistrictAliasesToWardCodes(districtName);
      if (districtWardCodes && districtWardCodes.length > 0) {
        exactWardCodes = districtWardCodes;
      }
    }

    // expandedWardCodes: nếu có ward code → mở rộng trong quận; nếu không có ward code nhưng có district → lấy toàn bộ ward của quận
    let expandedWardCodes: string[] = [];
    if (exactWardCodes.length > 0) {
      const allWardsInDistricts = new Set<string>();
      for (const wardCode of exactWardCodes) {
        const wardsInSameDistrict = this.geo.getWardsInSameDistrict(wardCode);
        if (wardsInSameDistrict && wardsInSameDistrict.length > 0) {
          wardsInSameDistrict.forEach((wc) => allWardsInDistricts.add(wc));
        } else {
          allWardsInDistricts.add(wardCode);
        }
      }
      expandedWardCodes = Array.from(allWardsInDistricts);
    } else if (districtName) {
      const wardCodesByDistrict =
        this.geo.expandDistrictAliasesToWardCodes(districtName);
      if (wardCodesByDistrict && wardCodesByDistrict.length > 0) {
        expandedWardCodes = wardCodesByDistrict;
      }
    }

    let lastFunctionsCount = 0;
    let lastFunctionsSummary: string[] = [];
    const describeFunction = (fn: any): string => {
      if (fn?.filter?.terms?.amenities) return 'amenities-boost';
      if (
        fn?.filter?.bool?.must?.some(
          (x: any) => x.term?.category === 'chung-cu',
        ) &&
        fn?.filter?.bool?.must?.some((x: any) => x.terms?.['address.wardCode'])
      )
        return 'chung-cu-ward';
      if (
        fn?.filter?.bool?.must?.some(
          (x: any) => x.term?.category === 'phong-tro',
        )
      )
        return 'phong-tro-ward';
      if (fn?.filter?.term?.category) return 'category-boost';
      if (fn?.gauss?.coords) return 'geo-distance';
      if (fn?.gauss?.createdAt) return 'freshness';
      if (fn?.filter?.bool?.must?.some((x: any) => x.term?.type === 'roommate'))
        return 'roommate-gender';
      return 'custom';
    };
    const buildFunctions = (isCategoryBoost = false) => {
      const functions: any[] = [];

      // --- Price soft boost (soft ranking, không loại bỏ kết quả khác giá) ---
      if (effectivePriceTarget && effectivePriceTarget > 0) {
        const scale = Math.max(400_000, Math.floor(effectivePriceTarget * 0.3)); // ~±30% giá mục tiêu, giữ tối thiểu 400k cho tầm giá thấp
        functions.push({
          gauss: {
            price: {
              origin: effectivePriceTarget,
              scale,
              offset: 0,
              decay: 0.5,
            },
          },
          weight: 10,
        });
      }

      // Tier 1 (King): Category user yêu cầu + đúng phường -> weight cao
      if (exactWardCodes.length > 0 && p.category) {
        const weight = p.category === 'chung-cu' ? 95 : 30;
        functions.push({
          filter: {
            bool: {
              must: [
                { term: { category: p.category } },
                { terms: { 'address.wardCode': exactWardCodes } },
              ],
            },
          },
          weight,
        });
      }

      // Tier 1.5: Category khác + đúng phường -> weight thấp (để vẫn hiện nhưng ở dưới khi kết quả ít)
      if (exactWardCodes.length > 0 && p.category) {
        const otherCategories = [
          'chung-cu',
          'phong-tro',
          'nha-nguyen-can',
        ].filter((c) => c !== p.category);
        for (const otherCat of otherCategories) {
          functions.push({
            filter: {
              bool: {
                must: [
                  { term: { category: otherCat } },
                  { terms: { 'address.wardCode': exactWardCodes } },
                ],
              },
            },
            weight: 5, // Weight thấp để hiện ở dưới
          });
        }
      }

      // Tier 2 (Queen): Category user yêu cầu + phường lân cận -> weight trung bình
      const nearbyOnlyWardCodes = expandedWardCodes.filter(
        (wc) => !exactWardCodes.includes(wc),
      );
      if (nearbyOnlyWardCodes.length > 0 && p.category) {
        const weight = p.category === 'chung-cu' ? 40 : 20;
        functions.push({
          filter: {
            bool: {
              must: [
                { term: { category: p.category } },
                { terms: { 'address.wardCode': nearbyOnlyWardCodes } },
              ],
            },
          },
          weight,
        });
      }

      // Tier 4: District-level soft boost nếu không có ward_code (dựa trên district alias)
      if (expandedWardCodes.length > 0) {
        functions.push({
          filter: { terms: { 'address.wardCode': expandedWardCodes } },
          weight: 20,
        });
      }

      // Boost cho category user yêu cầu (tăng mạnh để đẩy đúng loại lên top)
      if (p.category) {
        const catWeight = p.category === 'phong-tro' ? 30 : 25;
        functions.push({
          filter: { term: { category: p.category } },
          weight: catWeight,
        });
      }

      // Nếu chưa có category mà query có từ "phòng" chung chung → ưu tiên phong-tro, sau đó chung-cu
      if (!p.category && inferredCategoryBoosts.length > 0) {
        for (const cat of inferredCategoryBoosts) {
          functions.push({
            filter: { term: { category: cat } },
            weight: cat === 'phong-tro' ? 18 : 12,
          });
        }
        // Phạt nhẹ nhà nguyên căn để giữ ưu tiên phòng/chung cư khi user chỉ gõ "phòng"
        functions.push({
          filter: { term: { category: 'nha-nguyen-can' } },
          weight: 0.6,
        });
      }

      // PostType boosting mềm: ưu tiên loại người dùng muốn, phạt nhẹ loại còn lại
      const roommateBoostFilter = {
        bool: {
          should: [
            { term: { type: 'tim-o-ghep' } },
            { term: { postType: 'tim-o-ghep' } },
            ...roommateTextClauses,
          ],
        },
      };
      if (effectivePostType === 'cho-thue') {
        functions.push({
          filter: { term: { type: 'cho-thue' } },
          weight: 20,
        });
        // Phạt mạnh tim-o-ghep khi user tìm cho-thue
        functions.push({
          filter: roommateBoostFilter,
          weight: 0.05,
        });
      } else if (effectivePostType === 'tim-o-ghep') {
        functions.push({
          filter: roommateBoostFilter,
          weight: 14,
        });
        // Phạt mạnh cho-thue khi user tìm ở ghép
        functions.push({
          filter: { term: { type: 'cho-thue' } },
          weight: 0.05,
        });
      } else if (!effectivePostType) {
        // Mặc định: ưu tiên cho-thue, phạt tim-o-ghep mạnh hơn
        functions.push({
          filter: { term: { type: 'cho-thue' } },
          weight: 20,
        });
        functions.push({
          filter: roommateBoostFilter,
          weight: 0.05,
        });
      }

      // Roommate boosting by searcher gender
      if (
        p.roommate &&
        (p.searcherGender === 'male' || p.searcherGender === 'female')
      ) {
        functions.push({
          filter: {
            bool: {
              must: [
                roommateBoostFilter,
                { term: { gender: p.searcherGender } },
              ],
            },
          },
          weight: 2.0,
        });
        functions.push({
          filter: {
            bool: {
              must: [roommateBoostFilter],
              must_not: [{ term: { gender: p.searcherGender } }],
            },
          },
          weight: 0.6,
        });
      }

      // Các boost cũ: geo-distance và độ mới
      if (p.lat != null && p.lon != null) {
        functions.push({
          gauss: {
            coords: {
              origin: `${p.lat},${p.lon}`,
              scale: '2km',
              offset: '200m',
              decay: 0.5,
            },
          },
          weight: 2.0,
        });
      }
      functions.push({
        gauss: { createdAt: { origin: 'now', scale: '7d', decay: 0.6 } },
        weight: 1.2,
      });

      lastFunctionsSummary = functions.map((fn) => describeFunction(fn));
      return functions;
    };

    // --- 4. Logic tìm kiếm đa pha (Soft Ranking) ---
    const executeSearch = async (
      phase: string,
      currentFilter: any[],
      currentFunctions: any[],
    ) => {
      // Xây dựng sort options
      let sort: any[] = [{ _score: 'desc' }, { createdAt: 'desc' }];
      if (p.sort === 'newest') sort = [{ createdAt: 'desc' }];
      else if (p.sort === 'price_asc')
        sort = [{ price: 'asc' }, { _score: 'desc' }];
      else if (p.sort === 'price_desc')
        sort = [{ price: 'desc' }, { _score: 'desc' }];
      else if (p.sort === 'nearest' && p.lat != null && p.lon != null) {
        sort = [
          {
            _geo_distance: {
              coords: { lat: p.lat, lon: p.lon },
              order: 'asc',
              unit: 'm',
            },
          },
        ];
      }

      const body: any = {
        track_total_hits: true,
        from,
        size,
        sort,
        query: {
          function_score: {
            query: {
              bool: {
                must: must.length ? must : [{ match_all: {} }],
                filter: currentFilter,
              },
            },
            functions: currentFunctions,
            boost_mode: 'sum' as const,
            score_mode: 'sum' as const, // Sum để các weight cộng dồn, tạo khoảng cách điểm lớn
          },
        },
        highlight: {
          pre_tags: ['<em>'],
          post_tags: ['</em>'],
          fields: {
            'address.full.*': {},
            'title.*': {},
            'buildingName.*': {},
            'roomDescription.*': {},
          },
        },
      };

      // Tự động bật Hybrid (BM25 + Vector + RRF) khi có text query (guarded by USE_HYBRID_AUTO flag).
      // FE KHÔNG cần (và không nên) điều khiển mode; hệ thống tự quyết định.
      if (p.q && p.q.trim()) {
        try {
          const queryEmbedding = await this.embeddingService.createEmbedding(
            p.q,
            'query',
          );
          if (queryEmbedding && queryEmbedding.length > 0) {
            body.knn = {
              field: 'contentEmbedding',
              query_vector: queryEmbedding,
              k: Math.min(size * 3, 200),
              num_candidates: 1000,
            };
            // RRF cần license; để tránh lỗi license trên môi trường hiện tại, bỏ body.rank
            debugHybrid = true;
          }
        } catch (e: any) {
          // Log warning nhưng fallback về BM25 only
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.warn(
              '[SearchService] Hybrid vector branch failed, fallback BM25 only:',
              e?.message || e,
            );
          }
        }
      }
      const start = Date.now();
      try {
        const resp = await this.es.search({ index: this.index, body } as any);
        const tookMs = Date.now() - start;
        const hits = this.extractTotalHits(resp);
        phaseAttempts.push({
          phase,
          tookMs,
          hits,
          filters: currentFilter.length,
          functions: currentFunctions.length,
        });
        lastFunctionsCount = currentFunctions.length;
        return { resp, hits };
      } catch (e: any) {
        // Nếu lỗi do thiếu field contentEmbedding (mapping không có vector), fallback BM25
        const msg =
          e?.meta?.body?.error?.root_cause?.[0]?.reason || e?.message || '';
        const hasKnn = !!(body as any).knn;
        if (hasKnn && /contentembedding/i.test(msg)) {
          delete (body as any).knn;
          debugHybrid = false;
          const resp = await this.es.search({ index: this.index, body } as any);
          const tookMs = Date.now() - start;
          const hits = this.extractTotalHits(resp);
          phaseAttempts.push({
            phase: `${phase}-bm25-fallback`,
            tookMs,
            hits,
            filters: currentFilter.length,
            functions: currentFunctions.length,
          });
          lastFunctionsCount = currentFunctions.length;
          return { resp, hits };
        }
        throw e;
      }
    };

    let resp, totalHits;

    // Phase 1: Strict search với phường chính xác
    let currentFilters = buildFilters(true, exactWardCodes);
    let currentFunctions = buildFunctions(false);
    let phaseResult = await executeSearch(
      'strict',
      currentFilters,
      currentFunctions,
    );
    resp = phaseResult.resp;
    totalHits = phaseResult.hits;

    // Phase 2 (Relax 1): Mở rộng ra các phường lân cận
    if (totalHits < minResults && !p.strict && expandedWardCodes.length > 0) {
      currentFilters = buildFilters(true, expandedWardCodes);
      phaseResult = await executeSearch(
        'nearby-wards',
        currentFilters,
        currentFunctions,
      );
      resp = phaseResult.resp;
      totalHits = phaseResult.hits;
    }

    // Phase 3: Bỏ qua bước "category-soft" để giữ filter category (đảm bảo đúng loại hình)

    // Phase 4 (Relax 3): Bỏ bớt constraint, nhưng vẫn giữ ward/district nếu có; chỉ nới giá/geo
    if (totalHits < minResults && !p.strict) {
      const minimalFilters: any[] = [
        { term: { status: 'active' } },
        { term: { isActive: true } },
      ];
      // Giữ ward/district nếu đã có
      if (exactWardCodes.length > 0) {
        minimalFilters.push({ terms: { 'address.wardCode': exactWardCodes } });
      } else if (expandedWardCodes.length > 0) {
        minimalFilters.push({
          terms: { 'address.wardCode': expandedWardCodes },
        });
      }

      // Nới price range nếu có price filter ban đầu và không phải là price comparison mode
      if ((p.minPrice != null || p.maxPrice != null) && !p.priceComparison) {
        const priceRange: any = {};
        if (p.minPrice != null) {
          priceRange.gte = Math.max(0, Math.floor(p.minPrice * 0.85));
        }
        if (p.maxPrice != null) {
          priceRange.lte = Math.floor(p.maxPrice * 1.15);
        }
        if (Object.keys(priceRange).length > 0) {
          minimalFilters.push({ range: { price: priceRange } });
        }
      }

      // Giữ geo filter nếu có (quan trọng cho UX)
      if (p.lat != null && p.lon != null && p.distance) {
        minimalFilters.push({
          geo_distance: {
            distance: p.distance,
            coords: { lat: p.lat, lon: p.lon },
          },
        });
      }
      if (p.province_code) {
        minimalFilters.push({
          term: { 'address.provinceCode': p.province_code },
        });
      }
      // Phase 4: Bỏ filter cứng category để có thêm kết quả (soft ranking)
      // Category sẽ được boost qua function_score (weight cao cho category yêu cầu, thấp cho category khác)
      applyRoommateFilters(minimalFilters);
      currentFilters = minimalFilters;
      // Giữ functions để vẫn có ranking
      phaseResult = await executeSearch(
        'minimal',
        currentFilters,
        currentFunctions,
      );
      resp = phaseResult.resp;
      totalHits = phaseResult.hits;
    }

    // Phase 5 (Broad): vẫn giữ ward/district để đảm bảo đúng địa lý; chỉ nới giá/geo nhẹ nếu cần thêm kết quả
    if (totalHits < pageSize && !p.strict) {
      const broadFilters: any[] = [
        { term: { status: 'active' } },
        { term: { isActive: true } },
      ];
      if (exactWardCodes.length > 0) {
        broadFilters.push({ terms: { 'address.wardCode': exactWardCodes } });
      } else if (expandedWardCodes.length > 0) {
        broadFilters.push({ terms: { 'address.wardCode': expandedWardCodes } });
      }
      if (p.province_code) {
        broadFilters.push({
          term: { 'address.provinceCode': p.province_code },
        });
      }
      if (p.lat != null && p.lon != null && p.distance) {
        broadFilters.push({
          geo_distance: {
            distance: p.distance,
            coords: { lat: p.lat, lon: p.lon },
          },
        });
      }
      if ((p.minPrice != null || p.maxPrice != null) && !p.priceComparison) {
        const priceRange: any = {};
        if (p.minPrice != null)
          priceRange.gte = Math.max(0, Math.floor(p.minPrice * 0.75));
        if (p.maxPrice != null) priceRange.lte = Math.floor(p.maxPrice * 1.25);
        if (Object.keys(priceRange).length > 0) {
          broadFilters.push({ range: { price: priceRange } });
        }
      }
      // Phase 5: Không filter cứng category (soft ranking qua boost)
      applyRoommateFilters(broadFilters);
      currentFilters = broadFilters;
      phaseResult = await executeSearch(
        'broad',
        currentFilters,
        currentFunctions,
      );
      resp = phaseResult.resp;
      totalHits = phaseResult.hits;
    }

    // --- 5. Xử lý và trả về kết quả ---
    const allWindowItems = (resp.hits?.hits || []).map((h: any) =>
      this.buildResponseItem(h),
    );
    const items = allWindowItems.slice(0, pageSize);
    const prefetchSlices: any[] = [];
    for (let i = 1; i <= prefetch; i++) {
      const start = i * pageSize;
      const end = start + pageSize;
      const sliceItems = allWindowItems.slice(start, end);
      if (sliceItems.length === 0) break;
      prefetchSlices.push({ page: page + i, items: sliceItems });
    }

    return {
      page,
      limit: pageSize,
      total: totalHits,
      items,
      prefetch: prefetchSlices,
      // Expose _score trong dev mode để debug ranking (có thể bật/tắt bằng env var)
      ...(process.env.NODE_ENV === 'development' && {
        _debug: {
          params: {
            category: p.category || null,
            postType: p.postType || null,
            q: p.q || null,
            district: p.district || null,
            ward_code: p.ward_code || null,
            minPrice: p.minPrice || null,
            maxPrice: p.maxPrice || null,
          },
          minResults,
          strict: p.strict || false,
          hybridApplied: debugHybrid,
          priceTarget: priceTarget || null,
          functions: {
            count: lastFunctionsCount,
            summary: lastFunctionsSummary,
          },
          phases: phaseAttempts,
        },
      }),
    };
  }
}
