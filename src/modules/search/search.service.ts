import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { GeoCodeService } from './geo-code.service';
import { AmenitiesService } from './amenities.service';
import { EmbeddingService } from './embedding.service';

// Mở rộng SearchPostsParams để hỗ trợ filter mới và soft ranking
export type SearchPostsParams = {
  q?: string;
  city?: string; district?: string; ward?: string;
  minPrice?: number; maxPrice?: number;
  minArea?: number; maxArea?: number;
  lat?: number; lon?: number; distance?: string; // e.g. "3km"
  page?: number; limit?: number;
  prefetch?: number; // số trang preload tiếp theo (0-3)
  sort?: 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'nearest';
  postType?: 'rent' | 'roommate';
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
    if (typeof resp.hits?.total === 'object' && resp.hits.total?.value != null) {
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
    Object.keys(highlight).forEach(key => {
      if (allowedKeys.some(allowed => key.includes(allowed))) {
        const values = Array.isArray(highlight[key]) ? highlight[key] : [highlight[key]];
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
      // --- END: Trả về các trường mới ---
      ...(Object.keys(cleanHighlight).length > 0 && { highlight: cleanHighlight }),
    };
  }

  async searchPosts(p: SearchPostsParams) {
    const page = Math.max(1, Number(p.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(p.limit) || 12));
    // Mặc định preload thêm 3 trang (4 trang tổng cộng) nếu FE không truyền prefetch
    const rawPrefetch = p.prefetch ?? 3;
    const prefetch = Math.max(0, Math.min(3, Number(rawPrefetch) || 0));
    const from = (page - 1) * pageSize;
    const minResults = p.minResults ?? pageSize * 3; // Mặc định mong muốn có 3 trang kết quả
    const size = Math.min(50, pageSize * (1 + prefetch));
    // --- 1. Xây dựng Query cơ bản (Text Search) ---
    const must: any[] = [];
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
            'roomDescription.raw^2',
            'roomDescription.fold^1.5',
            'postDescription.fold^1',
                  ],
                  fuzziness: 'AUTO',
                  operator: 'or',
          },
        });
      }
      
    // Boost POI keywords trong title/description
    if (p.poiKeywords && p.poiKeywords.length > 0) {
      const poiQueries = p.poiKeywords.map(poiName => ({
        multi_match: {
          query: poiName,
          type: 'best_fields',
          fields: ['title.raw^6', 'roomDescription.raw^5', 'title.ng^4', 'roomDescription.fold^3', 'address.full.raw^2'],
          fuzziness: 'AUTO',
          },
      }));
      must.push({ bool: { should: poiQueries, minimum_should_match: 1, boost: 3.0 } });
    }

    // Boost amenities trong text (nếu có)
    if (p.amenities && p.amenities.length > 0) {
      const amenityQueries = p.amenities.map(amenityKey => {
        const keywords = this.amenities.getAmenityKeywords(amenityKey);
        if (keywords.length === 0) return null;
        return {
          bool: {
            should: keywords.map(keyword => ({
              multi_match: {
                query: keyword,
                type: 'best_fields',
                fields: ['title.raw^5', 'roomDescription.raw^4', 'title.ng^3', 'roomDescription.fold^2'],
                fuzziness: 'AUTO',
              },
            })),
            minimum_should_match: 1,
          },
        };
      }).filter(Boolean);
      if (amenityQueries.length > 0) {
        must.push({ bool: { should: amenityQueries, minimum_should_match: 1, boost: 1.5 } });
      }
    }

    // --- 2. Xây dựng các Filter ban đầu (Strict) ---
    const buildFilters = (isStrict = true, currentWardCodes: string[] = []) => {
      const filter: any[] = [
        { term: { status: 'active' } },
        { term: { isActive: true } },
      ];

      if (p.postType) filter.push({ term: { type: p.postType } });
      if (p.province_code) filter.push({ term: { 'address.provinceCode': p.province_code } });
      if (currentWardCodes.length > 0) filter.push({ terms: { 'address.wardCode': currentWardCodes } });
      
      // Chỉ áp dụng filter category ở chế độ strict, nếu không sẽ chuyển thành boost
      if (p.category && isStrict) {
        filter.push({ term: { category: p.category } });
      }

      // Filters cho các trường mới
      if (p.minBedrooms != null || p.maxBedrooms != null) {
        filter.push({ range: { bedrooms: { gte: p.minBedrooms, lte: p.maxBedrooms } } });
      }
      if (p.minBathrooms != null || p.maxBathrooms != null) {
        filter.push({ range: { bathrooms: { gte: p.minBathrooms, lte: p.maxBathrooms } } });
      }
      if (p.furniture) filter.push({ term: { furniture: p.furniture } });
      if (p.legalStatus) filter.push({ term: { legalStatus: p.legalStatus } });
      if (p.propertyType) filter.push({ term: { propertyType: p.propertyType } });
      
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
        filter.push({ geo_distance: { distance: p.distance, coords: { lat: p.lat, lon: p.lon } } });
      }

      // Filter amenities (exact match)
      if (p.amenities && p.amenities.length > 0) {
        filter.push({ terms: { amenities: p.amenities } });
      }

      // Exclude amenities
      if (p.excludeAmenities && p.excludeAmenities.length > 0) {
        filter.push({ bool: { must_not: { terms: { amenities: p.excludeAmenities } } } });
    }

      // Exclude districts
    if (p.excludeDistricts && p.excludeDistricts.length > 0) {
      const excludeDistrictCodes: string[] = [];
      for (const districtName of p.excludeDistricts) {
        const codes = this.geo.expandDistrictAliasesToWardCodes(districtName);
        if (codes) excludeDistrictCodes.push(...codes);
      }
      if (excludeDistrictCodes.length > 0) {
          filter.push({ bool: { must_not: { terms: { 'address.wardCode': excludeDistrictCodes } } } });
      }
    }

      // Roommate gender filter
    if (p.postType === 'roommate' && p.gender && p.gender !== 'any') {
      filter.push({ term: { gender: p.gender } });
    }
    
      return filter;
    };

    // --- 3. Xây dựng Function Score (Ranking Tiers) ---
    const toArr = (v?: string | string[]) => (Array.isArray(v) ? v : v ? [v] : []);
    let exactWardCodes = toArr(p.ward_code);

    // Nếu không có ward_code nhưng có district name, convert district -> wardCodes
    if (exactWardCodes.length === 0 && p.district) {
      const districtWardCodes = this.geo.expandDistrictAliasesToWardCodes(p.district);
      if (districtWardCodes && districtWardCodes.length > 0) {
        exactWardCodes = districtWardCodes;
      }
    }

    // Sửa lỗi logic expandedWardCodes: duyệt qua tất cả các phường để mở rộng
    let expandedWardCodes: string[] = [];
    if (exactWardCodes.length > 0) {
      const allWardsInDistricts = new Set<string>();
      for (const wardCode of exactWardCodes) {
        const wardsInSameDistrict = this.geo.getWardsInSameDistrict(wardCode);
        if (wardsInSameDistrict && wardsInSameDistrict.length > 0) {
          wardsInSameDistrict.forEach(wc => allWardsInDistricts.add(wc));
        } else {
          allWardsInDistricts.add(wardCode); // Giữ lại phường gốc nếu không tìm thấy quận
        }
      }
      expandedWardCodes = Array.from(allWardsInDistricts);
    }

    const buildFunctions = (isCategoryBoost = false) => {
      const functions: any[] = [];

      // Tier 1 (King): Chung cư + đúng phường -> weight: 80
      if (exactWardCodes.length > 0) {
        functions.push({
          filter: { bool: { must: [{ term: { category: 'chung-cu' } }, { terms: { 'address.wardCode': exactWardCodes } }] } },
          weight: 80,
        });
      }

      // Tier 2 (Queen): Chung cư + phường lân cận (KHÔNG bao gồm phường chính xác) -> weight: 40
      const nearbyOnlyWardCodes = expandedWardCodes.filter(wc => !exactWardCodes.includes(wc));
      if (nearbyOnlyWardCodes.length > 0) {
      functions.push({
          filter: { bool: { must: [{ term: { category: 'chung-cu' } }, { terms: { 'address.wardCode': nearbyOnlyWardCodes } }] } },
          weight: 40,
    });
      }

      // Tier 3 (Bishop): Phòng trọ + đúng phường -> weight: 20
    if (exactWardCodes.length > 0) {
      functions.push({
          filter: { bool: { must: [{ term: { category: 'phong-tro' } }, { terms: { 'address.wardCode': exactWardCodes } }] } },
          weight: 20,
        });
      }

      // Boost cho category nếu đang ở chế độ soft ranking
      if (p.category && isCategoryBoost) {
        functions.push({ filter: { term: { category: p.category } }, weight: 15 });
    }
    
      // Roommate boosting by searcher gender
    if (p.roommate && (p.searcherGender === 'male' || p.searcherGender === 'female')) {
      functions.push({
        filter: { bool: { must: [{ term: { type: 'roommate' } }, { term: { gender: p.searcherGender } }] } },
        weight: 2.0,
      });
      functions.push({
        filter: { bool: { must: [{ term: { type: 'roommate' } }], must_not: [{ term: { gender: p.searcherGender } }] } },
        weight: 0.6,
      });
    }

      // Các boost cũ: geo-distance và độ mới
      if (p.lat != null && p.lon != null) {
        functions.push({ gauss: { coords: { origin: `${p.lat},${p.lon}`, scale: '2km', offset: '200m', decay: 0.5 } }, weight: 2.0 });
      }
      functions.push({ gauss: { createdAt: { origin: 'now', scale: '7d', decay: 0.6 } }, weight: 1.2 });

      return functions;
    };

    // --- 4. Logic tìm kiếm đa pha (Soft Ranking) ---
    const executeSearch = async (currentFilter: any[], currentFunctions: any[]) => {
      // Xây dựng sort options
      let sort: any[] = [{ _score: 'desc' }, { createdAt: 'desc' }];
      if (p.sort === 'newest') sort = [{ createdAt: 'desc' }];
      else if (p.sort === 'price_asc') sort = [{ price: 'asc' }, { _score: 'desc' }];
      else if (p.sort === 'price_desc') sort = [{ price: 'desc' }, { _score: 'desc' }];
      else if (p.sort === 'nearest' && p.lat != null && p.lon != null) {
        sort = [{ _geo_distance: { coords: { lat: p.lat, lon: p.lon }, order: 'asc', unit: 'm' } }];
          }
      
      const body: any = {
        track_total_hits: true,
        from,
        size,
        sort,
        query: {
          function_score: {
            query: { bool: { must: must.length ? must : [{ match_all: {} }], filter: currentFilter } },
            functions: currentFunctions,
            boost_mode: 'sum' as const,
            score_mode: 'sum' as const, // Sum để các weight cộng dồn, tạo khoảng cách điểm lớn
          },
        },
        highlight: {
          pre_tags: ['<em>'], post_tags: ['</em>'],
          fields: { 'address.full.*': {}, 'title.*': {}, 'buildingName.*': {}, 'roomDescription.*': {} },
        },
      };

      // Tự động bật Hybrid (BM25 + Vector + RRF) khi có text query.
      // FE KHÔNG cần (và không nên) điều khiển mode; hệ thống tự quyết định.
      if (p.q && p.q.trim()) {
        try {
          const queryEmbedding = await this.embeddingService.createEmbedding(p.q, 'query');
          if (queryEmbedding && queryEmbedding.length > 0) {
            body.knn = {
              field: 'contentEmbedding',
              query_vector: queryEmbedding,
              k: Math.min(size * 3, 200),
              num_candidates: 1000,
            };
            body.rank = {
              rrf: {
                window_size: 100,
                rank_constant: 20,
              },
            };
          }
        } catch (e: any) {
          // Log warning nhưng fallback về BM25 only
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.warn('[SearchService] Hybrid vector branch failed, fallback BM25 only:', e?.message || e);
          }
        }
      }
      return this.es.search({ index: this.index, body } as any);
    };

    let resp, totalHits;

    // Phase 1: Strict search với phường chính xác
    let currentFilters = buildFilters(true, exactWardCodes);
    let currentFunctions = buildFunctions(false);
    resp = await executeSearch(currentFilters, currentFunctions);
    totalHits = this.extractTotalHits(resp);

    // Phase 2 (Relax 1): Mở rộng ra các phường lân cận
    if (totalHits < minResults && !p.strict && expandedWardCodes.length > 0) {
      currentFilters = buildFilters(true, expandedWardCodes);
      resp = await executeSearch(currentFilters, currentFunctions);
      totalHits = this.extractTotalHits(resp);
    }

    // Phase 3 (Relax 2): Bỏ filter category, chuyển thành boost
    if (totalHits < minResults && !p.strict && p.category) {
      currentFilters = buildFilters(false, expandedWardCodes.length > 0 ? expandedWardCodes : exactWardCodes);
      currentFunctions = buildFunctions(true);
      resp = await executeSearch(currentFilters, currentFunctions);
      totalHits = this.extractTotalHits(resp);
    }

    // Phase 4 (Relax 3): Bỏ bớt constraint, chỉ giữ status/isActive + basic geo (nếu có)
    // Nới price range ±15% nếu có price filter ban đầu và query không chứa điều kiện giá chặt
    if (totalHits < minResults && !p.strict) {
      const minimalFilters: any[] = [
        { term: { status: 'active' } },
        { term: { isActive: true } },
      ];
      
      // Nới price range nếu có price filter ban đầu và không phải là price comparison mode
      if ((p.minPrice != null || p.maxPrice != null) && !p.priceComparison) {
        const priceRange: any = {};
        if (p.minPrice != null) {
          // Giảm minPrice 15% (cho phép rẻ hơn một chút)
          priceRange.gte = Math.max(0, Math.floor(p.minPrice * 0.85));
        }
        if (p.maxPrice != null) {
          // Tăng maxPrice 15% (cho phép đắt hơn một chút)
          priceRange.lte = Math.floor(p.maxPrice * 1.15);
        }
        if (Object.keys(priceRange).length > 0) {
          minimalFilters.push({ range: { price: priceRange } });
        }
      }
      
      // Giữ geo filter nếu có (quan trọng cho UX)
      if (p.lat != null && p.lon != null && p.distance) {
        minimalFilters.push({ geo_distance: { distance: p.distance, coords: { lat: p.lat, lon: p.lon } } });
      }
      // Giữ province filter nếu có (vẫn giới hạn trong tỉnh/thành phố)
      if (p.province_code) {
        minimalFilters.push({ term: { 'address.provinceCode': p.province_code } });
      }
      currentFilters = minimalFilters;
      // Giữ functions để vẫn có ranking
      resp = await executeSearch(currentFilters, currentFunctions);
      totalHits = this.extractTotalHits(resp);
    }
    
    // --- 5. Xử lý và trả về kết quả ---
    const allWindowItems = (resp.hits?.hits || []).map((h: any) => this.buildResponseItem(h));
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
      ...(process.env.NODE_ENV === 'development' && { _debug: { minResults, strict: p.strict || false } }),
    };
  }
}
