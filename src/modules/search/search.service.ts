import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

export type SearchPostsParams = {
  q?: string;
  city?: string; district?: string; ward?: string;
  minPrice?: number; maxPrice?: number;
  minArea?: number; maxArea?: number;
  lat?: number; lon?: number; distance?: string; // e.g. "3km"
  page?: number; limit?: number;
  sort?: 'relevance' | 'newest' | 'price_asc' | 'price_desc';
};

@Injectable()
export class SearchService {
  private readonly index: string;

  constructor(
    @Inject('ES_CLIENT') private readonly es: Client,
    private readonly cfg: ConfigService,
  ) {
    this.index = this.cfg.get<string>('ELASTIC_INDEX_POSTS') || 'posts';
  }

  async searchPosts(p: SearchPostsParams) {
    const page = Math.max(1, Number(p.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(p.limit) || 20));
    const from = (page - 1) * limit;

    const should: any[] = [];
    if (p.q && p.q.trim()) {
      should.push({
        multi_match: {
          query: p.q,
          fields: ['address.full^4', 'description^2.5', 'title^1.5'],
          type: 'best_fields',
          fuzziness: 'AUTO',
          minimum_should_match: '60%',
        },
      });
      should.push({ match_phrase: { title: { query: p.q, slop: 2 } } });
    }

    const filter: any[] = [{ term: { isActive: true } }];
    if (p.city)     filter.push({ term: { 'address.city': p.city } });
    if (p.district) filter.push({ term: { 'address.district': p.district } });
    if (p.ward)     filter.push({ term: { 'address.ward': p.ward } });

    if (p.minPrice != null || p.maxPrice != null) {
      filter.push({ range: { price: {
        gte: p.minPrice != null ? Number(p.minPrice) : undefined,
        lte: p.maxPrice != null ? Number(p.maxPrice) : undefined,
      } }});
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

    const body: any = {
      from,
      size: limit,
      sort,
      query: {
        bool: {
          must: should.length ? [{ bool: { should } }] : [{ match_all: {} }],
          filter,
        },
      },
    };

    body.highlight = {
      pre_tags: ['<mark>'],
      post_tags: ['</mark>'],
      fields: {
        'address.full': {},
        description: {},
        title: {},
      },
    };

    const resp = await this.es.search({ index: this.index, body });
    const items = (resp.hits?.hits || []).map((h: any) => ({
      id: h._id,
      score: h._score,
      ...(h._source || {}),
      highlight: h.highlight,
    }));

    return {
      page,
      limit,
      total: resp.hits?.total?.valueOf ?? 0,
      items,
    };
  }
}


