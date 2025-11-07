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
  district_code?: string | string[];
  ward_code?: string | string[];
  roommate?: boolean; // if true, mix rent+roommate but apply gender boost to roommate only
  searcherGender?: 'male' | 'female';
  amenities?: string[]; // Array of amenity keys (e.g., ["ban_cong", "gym"])
  category?: string; // "phong-tro", "chung-cu", "nha-nguyen-can"
  poiKeywords?: string[]; // POI names extracted from query (e.g., ["đại học công nghiệp", "IUH"])
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

  async searchPosts(p: SearchPostsParams) {
    const page = Math.max(1, Number(p.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(p.limit) || 12));
    const prefetch = Math.max(0, Math.min(3, Number(p.prefetch) || 0));
    const from = (page - 1) * pageSize;

    const must: any[] = [];
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

    // Boost amenities matches in title and description
    if (p.amenities && p.amenities.length > 0) {
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
        must.push({
          bool: {
            should: amenityQueries,
            minimum_should_match: 1,
            boost: 2.0, // Boost amenities matches
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
    const filter: any[] = [
      { term: { status: 'active' } },
      { term: { isActive: true } }
    ];
    if (p.postType) filter.push({ term: { type: p.postType } });
    // Category sẽ được xử lý sau khi xác định wardCodes/districtCodes (xem dưới)
    if (p.postType === 'roommate' && p.gender && p.gender !== 'any') {
      filter.push({ term: { gender: p.gender } });
    }
    // Prefer code-based filters
    const toArr = (v?: string | string[]) => (Array.isArray(v) ? v : v ? [v] : []);
    if (p.province_code) filter.push({ term: { 'address.provinceCode': p.province_code } });
    const wardCodes = toArr(p.ward_code);
    const districtCodes = toArr(p.district_code);
    if (wardCodes.length) filter.push({ terms: { 'address.wardCode': wardCodes } });
    if (districtCodes.length) filter.push({ terms: { 'address.districtCode': districtCodes } });
    // Ưu tiên wardCode. Nếu client chỉ cung cấp district (tên) -> map sang wardCode
    if (!wardCodes.length && !districtCodes.length && p.district) {
      const expanded = this.geo.expandDistrictAliasesToWardCodes(p.district);
      if (expanded && expanded.length) filter.push({ terms: { 'address.wardCode': expanded } });
    }
    // Legacy expansion: nếu không có ward_code, cố gắng mở rộng từ q
    if (!wardCodes.length && !districtCodes.length && p.q) {
      const expanded = this.geo.expandDistrictAliasesToWardCodes(p.q);
      if (expanded && expanded.length) filter.push({ terms: { 'address.wardCode': expanded } });
    }
    // Không filter theo tên city/district/ward để tránh lệ thuộc text; chỉ dùng code
    
    // CRITICAL: Nếu có ward_code/district_code (địa chỉ) + category → category là boost thay vì filter
    // Điều này cho phép ES trả về bài không có category nếu không có bài nào match, nhưng vẫn ưu tiên bài có category
    const hasLocationFilter = wardCodes.length > 0 || districtCodes.length > 0 || p.district || p.city;
    let categoryForBoost: string | undefined; // Lưu category để boost sau
    if (p.category && hasLocationFilter) {
      // Category là boost (không filter), sẽ boost trong function_score
      categoryForBoost = p.category;
    } else if (p.category) {
      // Không có location filter → category là filter (must) như cũ
      filter.push({ term: { category: p.category } });
    }

    if (p.minPrice != null || p.maxPrice != null) {
      // CRITICAL: Make price filter more flexible when combined with category
      // If both category and price are specified, widen the range slightly (±10%)
      let minPrice = p.minPrice != null ? Number(p.minPrice) : undefined;
      let maxPrice = p.maxPrice != null ? Number(p.maxPrice) : undefined;
      
      if (p.category && (minPrice != null || maxPrice != null)) {
        // Widen range by 10% when category is also specified (more flexible matching)
        if (minPrice != null) minPrice = Math.max(0, minPrice * 0.9); // Allow 10% below
        if (maxPrice != null) maxPrice = maxPrice * 1.1; // Allow 10% above
      }
      
      const priceFilter: any = {};
      if (minPrice != null) priceFilter.gte = minPrice;
      if (maxPrice != null) priceFilter.lte = maxPrice;
      
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

    const resp = await this.es.search({ index: this.index, body });
    const allWindowItems = (resp.hits?.hits || []).map((h: any) => {
      // Clean highlight to avoid frontend rendering issues
      const cleanHighlight: any = {};
      if (h.highlight) {
        // Only include highlight for title, description, address fields
        // Avoid rendering highlight fragments that might confuse frontend
        Object.keys(h.highlight).forEach(key => {
          if (key.includes('title') || key.includes('description') || key.includes('address')) {
            // Further filter: remove any highlight fragments that might contain standalone words like "Giá"
            const highlightValues = Array.isArray(h.highlight[key]) ? h.highlight[key] : [h.highlight[key]];
            const filteredValues = highlightValues.filter((val: string) => {
              // Remove highlights that are just single words or might be confusing
              const trimmed = val.replace(/<em>.*?<\/em>/g, '').trim();
              return trimmed.length > 3; // Only keep meaningful highlights
            });
            if (filteredValues.length > 0) {
              cleanHighlight[key] = filteredValues;
            }
          }
        });
      }
      
      // Build clean item object - explicitly exclude any fields that might confuse frontend
      const item: any = {
        id: h._id,
        score: h._score,
        postId: h._source?.postId,
        roomId: h._source?.roomId,
        title: h._source?.title,
        description: h._source?.description,
        category: h._source?.category,
        type: h._source?.type,
        price: h._source?.price,
        area: h._source?.area,
        address: h._source?.address,
        images: h._source?.images || [],
        coords: h._source?.coords,
        createdAt: h._source?.createdAt,
      };
      
      // Only include highlight if it's meaningful
      if (Object.keys(cleanHighlight).length > 0) {
        item.highlight = cleanHighlight;
      }
      
      return item;
    });

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
      total: typeof resp.hits?.total === 'object' ? (resp.hits.total as any).value ?? 0 : (resp.hits?.total ?? 0),
      items,
      prefetch: prefetchSlices,
    };
  }
}


