import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { GeoCodeService } from './geo-code.service';
import { AmenitiesService } from './amenities.service';

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
  roommate?: boolean; // if true, mix rent+roommate but apply gender boost to roommate only
  searcherGender?: 'male' | 'female';
  amenities?: string[]; // Array of amenity keys (e.g., ["ban_cong", "gym"])
  excludeAmenities?: string[]; // Amenities to exclude (e.g., ["gym"])
  excludeDistricts?: string[]; // Districts to exclude (e.g., ["quận 1"])
  category?: string; // "phong-tro", "chung-cu", "nha-nguyen-can"
  poiKeywords?: string[]; // POI names extracted from query (e.g., ["đại học công nghiệp", "IUH"])
  priceComparison?: 'cheaper' | 'more_expensive'; // Price comparison mode
};

@Injectable()
export class SearchService {
  private readonly index: string;

  constructor(
    @Inject('ES_CLIENT') private readonly es: Client,
    private readonly cfg: ConfigService,
    private readonly geo: GeoCodeService,
    private readonly amenities: AmenitiesService,
  ) {
    this.index = this.cfg.get<string>('ELASTIC_INDEX_POSTS') || 'posts';
  }

  // Helper: build response item từ ES hit
  private buildResponseItem(h: any) {
    const source = h._source || {};
    const highlight = h.highlight || {};
    
    // Clean highlight: chỉ giữ title, description, address, loại bỏ fragments quá ngắn
    const cleanHighlight: any = {};
    const allowedKeys = ['title', 'description', 'address'];
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
      description: source.description,
      category: source.category,
      type: source.type,
      price: source.price,
      area: source.area,
      address: source.address,
      images: source.images || [],
      coords: source.coords,
      createdAt: source.createdAt,
      ...(Object.keys(cleanHighlight).length > 0 && { highlight: cleanHighlight }),
    };
  }

  async searchPosts(p: SearchPostsParams) {
    const page = Math.max(1, Number(p.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(p.limit) || 12));
    const prefetch = Math.max(0, Math.min(3, Number(p.prefetch) || 0));
    const from = (page - 1) * pageSize;
    
    // Ngưỡng mở rộng: nếu kết quả ít hơn threshold này thì mới mở rộng sang các phường lân cận
    const expansionThreshold = Math.max(30, pageSize * 2); // Ít nhất 30 hoặc 2 lần pageSize

    const must: any[] = [];
    const filter: any[] = [];
    const hasGeo = p.lat != null && p.lon != null && !!p.distance;
    if (p.q && p.q.trim()) {
      // CRITICAL: If query is just a number + "triệu" (price only), don't enforce strict text matching
      // This allows price-only searches to return results even if text doesn't match
      const isPriceOnlyQuery = /^\s*\d+\s*(triệu|trieu|triệu|million)\s*$/i.test(p.q.trim());
      
      if (isPriceOnlyQuery && (p.minPrice != null || p.maxPrice != null)) {
        // Price-only query: Make text search optional (should clause, not must)
        // This allows results based on price filter even if text doesn't match
        must.push({
          bool: {
            should: [
              {
                multi_match: {
                  query: p.q,
                  type: 'most_fields',
                  fields: [
                    'address.full.raw^6',
                    'address.full.fold^5',
                    'title.raw^3',
                    'title.fold^2.5',
                    'title.ng^2',
                    'description.raw^2',
                    'description.fold^1.5',
                  ],
                  fuzziness: 'AUTO',
                  operator: 'or',
                },
              },
              { match_all: {} }, // Allow all if text doesn't match
            ],
            minimum_should_match: 1, // At least one should match (match_all counts)
          },
        });
      } else if (hasGeo) {
        // Geo-focused query: make text optional to avoid zero results around POI
        must.push({
          bool: {
            should: [
              {
                multi_match: {
                  query: p.q,
                  type: 'most_fields',
                  fields: [
                    'address.full.raw^6',
                    'address.full.fold^5',
                    'title.raw^3',
                    'title.fold^2.5',
                    'title.ng^2',
                    'description.raw^2',
                    'description.fold^1.5',
                  ],
                  fuzziness: 'AUTO',
                  operator: 'or',
                },
              },
              { match_all: {} },
            ],
            minimum_should_match: 1,
          },
        });
      } else {
        // Normal query: Enforce text matching
        must.push({
          multi_match: {
            query: p.q,
            type: 'most_fields',
            fields: [
              'address.full.raw^6',      // Strongest: exact address match
              'address.full.fold^5',     // Folded (no accents) address
              'title.raw^3',             // Title exact match
              'title.fold^2.5',          // Title folded
              'title.ng^2',              // Title ngram
              'description.raw^2',       // Description exact
              'description.fold^1.5',   // Description folded
            ],
            fuzziness: 'AUTO',          // Allow typos
            operator: 'or',              // Match any term (not all)
          },
        });
      }
      
      // Additional: if query contains category keywords, boost them in full-text
      // This is handled by the multi_match above, but we can add explicit boost
      const qLower = p.q.toLowerCase();
      if ((qLower.includes('chung cư') || qLower.includes('căn hộ')) && !p.category) {
        // Boost chung cu keywords in title/description
        must.push({
          bool: {
            should: [
              { match: { 'title.raw': { query: 'chung cư', boost: 2.0 } } },
              { match: { 'title.raw': { query: 'căn hộ', boost: 2.0 } } },
            ],
          },
        });
      } else if (qLower.includes('phòng trọ') && !p.category) {
        // Boost phong tro keywords
        must.push({
          match: { 'title.raw': { query: 'phòng trọ', boost: 2.0 } },
        });
      }
    }

    // Filter by amenities field (exact match on indexed amenities)
    if (p.amenities && p.amenities.length > 0) {
      // First, add exact filter on amenities field (if post has indexed amenities)
      filter.push({
        terms: { amenities: p.amenities },
      });
      
      // Also boost amenities matches in title and description (for posts without indexed amenities)
      const amenityQueries = p.amenities.map(amenityKey => {
        const keywords = this.amenities.getAmenityKeywords(amenityKey);
        if (keywords.length === 0) return null;
        
        // Create should clause for each keyword (OR logic)
        return {
          bool: {
            should: keywords.map(keyword => ({
              multi_match: {
                query: keyword,
                type: 'best_fields',
                fields: [
                  'title.raw^5',      // Strong boost in title
                  'description.raw^4', // Strong boost in description
                  'title.ng^3',
                  'description.fold^2',
                ],
                fuzziness: 'AUTO',
              },
            })),
            minimum_should_match: 1,
          },
        };
      }).filter(Boolean);

      if (amenityQueries.length > 0) {
        // Add as should clause with boost (OR logic across amenities)
        // This helps find posts that mention amenities in text but haven't been indexed yet
        must.push({
          bool: {
            should: amenityQueries,
            minimum_should_match: 1,
            boost: 1.5, // Lower boost since we already filter by amenities field
          },
        });
      }
    }

    // Negative filters: exclude amenities (must_not)
    if (p.excludeAmenities && p.excludeAmenities.length > 0) {
      // First, exclude by amenities field (exact match)
      filter.push({
        bool: {
          must_not: {
            terms: { amenities: p.excludeAmenities },
          },
        },
      });
      
      // Also exclude by text matching (for posts without indexed amenities)
      const excludeQueries = p.excludeAmenities.flatMap(amenityKey => {
        const keywords = this.amenities.getAmenityKeywords(amenityKey);
        return keywords.map(keyword => ({
          multi_match: {
            query: keyword,
            type: 'best_fields',
            fields: ['title.raw', 'description.raw'],
            fuzziness: 'AUTO',
          },
        }));
      });

      if (excludeQueries.length > 0) {
        filter.push({
          bool: {
            must_not: excludeQueries,
          },
        });
      }
    }

    // Negative filters: exclude districts
    if (p.excludeDistricts && p.excludeDistricts.length > 0) {
      const excludeDistrictCodes: string[] = [];
      for (const districtName of p.excludeDistricts) {
        const codes = this.geo.expandDistrictAliasesToWardCodes(districtName);
        if (codes) excludeDistrictCodes.push(...codes);
      }
      if (excludeDistrictCodes.length > 0) {
        filter.push({
          bool: {
            must_not: {
              terms: { 'address.wardCode': excludeDistrictCodes },
            },
          },
        });
      }
    }

    // Boost POI keywords in title and description (e.g., "đại học công nghiệp", "IUH")
    // This helps find posts that mention the POI in title/description even if not geocoded nearby
    if (p.poiKeywords && p.poiKeywords.length > 0) {
      const poiQueries = p.poiKeywords.map(poiName => ({
        multi_match: {
          query: poiName,
          type: 'best_fields',
          fields: [
            'title.raw^6',        // Very strong boost in title (highest priority)
            'description.raw^5', // Strong boost in description
            'title.ng^4',
            'description.fold^3',
            'address.full.raw^2', // Also boost if POI appears in address
          ],
          fuzziness: 'AUTO',
        },
      }));

      if (poiQueries.length > 0) {
        // Add as should clause with high boost (OR logic across POI keywords)
        must.push({
          bool: {
            should: poiQueries,
            minimum_should_match: 1,
            boost: 3.0, // High boost for POI matches in title/description
          },
        });
      }
    }

    // CRITICAL: Chỉ lấy posts có status="active" và isActive=true
    // Indexer đã đảm bảo chỉ index active posts, nhưng vẫn filter để chắc chắn
    filter.push(
      { term: { status: 'active' } },
      { term: { isActive: true } }
    );
    if (p.postType) filter.push({ term: { type: p.postType } });
    // Category sẽ được xử lý sau khi xác định wardCodes/districtCodes (xem dưới)
    if (p.postType === 'roommate' && p.gender && p.gender !== 'any') {
      filter.push({ term: { gender: p.gender } });
    }
    
    // Thời gian đăng (từ NLP parsing)
    const anyParams = p as any;
    if (anyParams.minCreatedAt) {
      filter.push({
        range: {
          createdAt: { gte: anyParams.minCreatedAt },
        },
      });
    }
    // Prefer code-based filters
    const toArr = (v?: string | string[]) => (Array.isArray(v) ? v : v ? [v] : []);
    if (p.province_code) filter.push({ term: { 'address.provinceCode': p.province_code } });
    const wardCodes = toArr(p.ward_code);
    // Không dùng districtCodes vì mapping chỉ là helper, không có districtCodes thực sự
    
    // Lưu ward codes chính xác để boost và mở rộng sau nếu cần
    let exactWardCodes: string[] = []; // Ward codes chính xác từ query
    let expandedWardCodes: string[] = []; // Ward codes đã mở rộng (sẽ dùng nếu kết quả ít)
    
    // Phase 1: Tìm chính xác theo wardCodes (không mở rộng ngay)
    if (wardCodes.length > 0) {
      exactWardCodes = wardCodes;
      // Chuẩn bị danh sách mở rộng (sẽ dùng nếu kết quả ít)
      const allWardsInDistricts = new Set<string>();
      for (const wardCode of wardCodes) {
        const wardsInSameDistrict = this.geo.getWardsInSameDistrict(wardCode);
        if (wardsInSameDistrict && wardsInSameDistrict.length > 0) {
          wardsInSameDistrict.forEach(wc => allWardsInDistricts.add(wc));
        } else {
          // Nếu không tìm thấy quận, vẫn giữ ward code gốc
          allWardsInDistricts.add(wardCode);
        }
      }
      expandedWardCodes = Array.from(allWardsInDistricts);
      
      // Phase 1: Filter theo ward codes chính xác (chưa mở rộng)
      filter.push({ terms: { 'address.wardCode': exactWardCodes } });
    }
    // Không filter theo districtCodes vì mapping chỉ là helper, không có districtCodes thực sự
    // Ưu tiên wardCode. Nếu client chỉ cung cấp district (tên) -> map sang wardCode
    if (!wardCodes.length && p.district) {
      const expanded = this.geo.expandDistrictAliasesToWardCodes(p.district);
      if (expanded && expanded.length) {
        // Khi map từ district, cũng áp dụng logic mở rộng tương tự
        const districtWardCodes = expanded;
        filter.push({ terms: { 'address.wardCode': districtWardCodes } });
      }
    }
    // Legacy expansion: nếu không có ward_code, cố gắng mở rộng từ q
    if (!wardCodes.length && p.q) {
      const expanded = this.geo.expandDistrictAliasesToWardCodes(p.q);
      if (expanded && expanded.length) filter.push({ terms: { 'address.wardCode': expanded } });
    }
    // Không filter theo tên city/district/ward để tránh lệ thuộc text; chỉ dùng code
    
    // CRITICAL: Nếu có ward_code (địa chỉ) + category → category là boost thay vì filter
    // Điều này cho phép ES trả về bài không có category nếu không có bài nào match, nhưng vẫn ưu tiên bài có category
    const hasLocationFilter = wardCodes.length > 0 || p.district || p.city;
    let categoryForBoost: string | undefined; // Lưu category để boost sau
    if (p.category && hasLocationFilter) {
      // Category là boost (không filter), sẽ boost trong function_score
      categoryForBoost = p.category;
    } else if (p.category) {
      // Không có location filter → category là filter (must) như cũ
      filter.push({ term: { category: p.category } });
    }

    if (p.minPrice != null || p.maxPrice != null) {
      // ES chỉ tôn trọng minPrice / maxPrice từ NlpSearchService (không widen tự động)
      const priceFilter: any = {};
      if (p.minPrice != null) priceFilter.gte = Number(p.minPrice);
      if (p.maxPrice != null) priceFilter.lte = Number(p.maxPrice);
      
      if (Object.keys(priceFilter).length > 0) {
        filter.push({ range: { price: priceFilter } });
      }
    } else if (p.priceComparison) {
      // Price comparison mode: cheaper hoặc more_expensive
      // Tính giá trung bình từ ES aggregation (sẽ làm sau nếu cần)
      // Tạm thời: cheaper = < 5 triệu, more_expensive = > 10 triệu
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
    if (p.minArea != null || p.maxArea != null) {
      filter.push({ range: { area: {
        gte: p.minArea != null ? Number(p.minArea) : undefined,
        lte: p.maxArea != null ? Number(p.maxArea) : undefined,
      } }});
    }
    if (p.lat != null && p.lon != null && p.distance) {
      filter.push({
        geo_distance: {
          distance: p.distance,
          coords: { lat: Number(p.lat), lon: Number(p.lon) },
        },
      });
    }

    let sort: any[] = [{ _score: 'desc' }, { createdAt: 'desc' }];
    if (p.sort === 'newest') sort = [{ createdAt: 'desc' }];
    else if (p.sort === 'price_asc') sort = [{ price: 'asc' }, { _score: 'desc' }];
    else if (p.sort === 'price_desc') sort = [{ price: 'desc' }, { _score: 'desc' }];
    else if (p.sort === 'nearest' && p.lat != null && p.lon != null) {
      sort = [
        {
          _geo_distance: {
            coords: { lat: Number(p.lat), lon: Number(p.lon) },
            order: 'asc',
            unit: 'm',
          },
        },
      ];
    }

    const functions: any[] = [];
    if (p.lat != null && p.lon != null) {
      functions.push({
        gauss: {
          coords: {
            origin: `${Number(p.lat)},${Number(p.lon)}`,
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

    // Boost cho ward codes chính xác (ưu tiên phường chính xác khi mở rộng sang các phường lân cận)
    if (exactWardCodes.length > 0) {
      functions.push({
        filter: { terms: { 'address.wardCode': exactWardCodes } },
        weight: 3.0, // Boost cao cho phường chính xác
      });
    }

    // Category boosting when location filter is present (category is boost, not filter)
    if (categoryForBoost) {
      functions.push({
        filter: { term: { category: categoryForBoost } },
        weight: 2.0, // Boost cao cho bài có category match
      });
    }
    
    // Roommate boosting by searcher gender (mix rent + roommate)
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

    const esSize = Math.min(50, pageSize * (1 + prefetch));

    const body: any = {
      track_total_hits: true,
      from,
      size: esSize,
      sort,
      query: {
        function_score: {
          query: { bool: { must: must.length ? must : [{ match_all: {} }], filter } },
          functions,
          boost_mode: 'sum',
          score_mode: 'avg',
        },
      },
    };

    body.highlight = {
      pre_tags: ['<em>'],
      post_tags: ['</em>'],
      fields: {
        'address.full.*': {},
        'description.*': {},
        'title.*': {},
      },
    };

    // Phase 1: Tìm chính xác với exactWardCodes
    let resp = await this.es.search({ index: this.index, body });
    let totalHits = typeof resp.hits?.total === 'object' ? (resp.hits.total as any).value ?? 0 : (resp.hits?.total ?? 0);
    
    // Phase 2: Nếu kết quả ít hơn ngưỡng và có wardCodes, mở rộng sang các phường lân cận
    if (totalHits < expansionThreshold && exactWardCodes.length > 0 && expandedWardCodes.length > exactWardCodes.length) {
      // Tạo filter mới với expandedWardCodes (thay thế filter wardCode chính xác)
      const expandedFilter = filter.map(f => {
        // Tìm và thay thế filter wardCode chính xác bằng filter mở rộng
        if (f.terms && f.terms['address.wardCode']) {
          // Kiểm tra xem có phải là filter chính xác không (chỉ có exactWardCodes)
          const currentWardCodes = Array.isArray(f.terms['address.wardCode']) 
            ? f.terms['address.wardCode'] 
            : [f.terms['address.wardCode']];
          const isExactFilter = currentWardCodes.length === exactWardCodes.length &&
            currentWardCodes.every(wc => exactWardCodes.includes(wc));
          
          if (isExactFilter) {
            // Thay thế bằng filter mở rộng
            return { terms: { 'address.wardCode': expandedWardCodes } };
          }
        }
        return f;
      });
      
      const expandedBody = {
        ...body,
        query: {
          function_score: {
            query: { bool: { must: must.length ? must : [{ match_all: {} }], filter: expandedFilter } },
            functions,
            boost_mode: 'sum',
            score_mode: 'avg',
          },
        },
      };
      
      resp = await this.es.search({ index: this.index, body: expandedBody });
      totalHits = typeof resp.hits?.total === 'object' ? (resp.hits.total as any).value ?? 0 : (resp.hits?.total ?? 0);
    }
    
    const allWindowItems = (resp.hits?.hits || []).map((h: any) => this.buildResponseItem(h));

    // Slice current page items and prepare prefetch slices (each of pageSize items)
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
    };
  }
}


