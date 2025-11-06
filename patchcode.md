Goal: Nâng cấp search tiếng Việt cho HCM/HN bằng synonyms địa danh + mapping quận cũ → phường mới. Không thay đổi field cũ; chỉ bổ sung:

File tĩnh: config/analysis/synonyms.txt, config/legacy-district-mapping.json

ES: template dùng synonyms (vi_fold_ngram + synonym_graph)

BE: loader JSON, expand “quận/viết tắt/legacy” → terms theo address.wardCode, fallback geo nếu có centroid.

Yêu cầu chung

Không xoá/sửa field cũ. Chỉ thêm field mới: address.wardCode (keyword).

Code NestJS theo module search đang có.

Giữ Accept header ES “compatible-with=8”.

Tất cả đường dẫn file tĩnh đặt trong repo:

elasticsearch/config/analysis/synonyms.txt

config/legacy-district-mapping.json

1) Thêm file tĩnh (tạo mới)

elasticsearch/config/analysis/synonyms.txt

# ---------- HCM ----------
tphcm, tp hcm, hcm, sài gòn, sai gon, ho chi minh, thành phố hồ chí minh
quan 1, q1, q.1, district 1, d1
quan 3, q3, q.3, district 3, d3
go vap, gò vấp, gv, q go vap
thu duc, thủ đức, thanh pho thu duc, q2, q.2, q2 hcm, q9, q.9, quan 2, quan 9

# ---------- HN ----------
ha noi, hà nội, tp hn, hn
quan hoan kiem, hoan kiem, q hoan kiem, q1 ha noi, district 1 hanoi
ba dinh, quan ba dinh, q ba ding, q ba dinh

# ---------- General ----------
quan, q, q., quan., district => quan
phuong, p, p., phuong. => phuong


Có thể mở rộng dần. Hiện đủ dùng cho HCM/HN.

config/legacy-district-mapping.json (demo; thay ward_code thực tế khi có)

{
  "hcm:quan 1": ["HCM_Q1_BEN_NGHE", "HCM_Q1_BEN_THANH", "HCM_Q1_NGUYEN_THAI_BINH"],
  "hcm:go vap": ["HCM_GV_04", "HCM_GV_05", "HCM_GV_10"],
  "hcm:thu duc": ["HCM_TD_LINH_TRUNG", "HCM_TD_HIEP_PHU", "HCM_TD_AN_PHU"],
  "hn:hoan kiem": ["HN_HK_HANG_BUOM", "HN_HK_HANG_TRONG", "HN_HK_HANG_BAC"],
  "hn:ba dinh": ["HN_BD_DIEN_BIEN", "HN_BD_GIANG_VO", "HN_BD_NGOC_HA"]
}


Key = {cityKey}:{districtKey} (đã normalize), value = mảng ward_code.
Khi có mã hành chính chuẩn → chỉ cần thay nội dung file, code tự dùng.

2) Docker: mount synonyms cho ES

docker/docker-compose.yml (thêm volume):

services:
  elasticsearch:
    volumes:
      - ../elasticsearch/config/analysis:/usr/share/elasticsearch/config/analysis
    environment:
      - xpack.security.enabled=false
      - discovery.type=single-node


Sau khi mount, restart ES.

3) ES Template + Alias (bootstrap)

Tạo mới src/modules/search/search-bootstrap.service.ts

import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Client } from '@elastic/elasticsearch';
import { ES_CLIENT } from './es.client';

@Injectable()
export class SearchBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(SearchBootstrapService.name);
  private postsIndex: string;
  private postsAlias: string;

  constructor(
    @Inject(ES_CLIENT) private readonly es: Client,
    private readonly config: ConfigService,
  ) {
    this.postsIndex = this.config.get<string>('ELASTIC_INDEX_POSTS') || 'posts';
    this.postsAlias = this.config.get<string>('ELASTIC_ALIAS_POSTS') || 'posts_alias';
  }

  async onModuleInit() {
    await this.ensureTemplateAndAlias();
  }

  private async ensureTemplateAndAlias() {
    const templateName = `${this.postsIndex}_template_v2`;
    const indexName = `${this.postsIndex}_v2`;

    // 1) Put index template (analyzers + mappings)
    await this.es.indices.putIndexTemplate({
      name: templateName,
      index_patterns: [`${this.postsIndex}_v*`],
      template: {
        settings: {
          analysis: {
            normalizer: {
              kwd_fold: { type: 'custom', filter: ['lowercase','asciifolding'] }
            },
            filter: {
              vn_geo_syns: {
                type: 'synonym_graph',
                synonyms_path: 'analysis/synonyms.txt', // mounted
                updateable: true
              }
            },
            analyzer: {
              vi_fold_ngram: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase','asciifolding','vn_geo_syns']
              }
            }
          }
        },
        mappings: {
          properties: {
            title:       { type: 'text', analyzer: 'vi_fold_ngram' },
            description: { type: 'text', analyzer: 'vi_fold_ngram' },
            'address.full': { type: 'text', analyzer: 'vi_fold_ngram' },

            // filter exacts:
            type:     { type: 'keyword' },
            status:   { type: 'keyword' },
            source:   { type: 'keyword' },
            isActive: { type: 'boolean' },

            // geo & attrs:
            coords:   { type: 'geo_point' },
            createdAt:{ type: 'date' },
            price:    { type: 'integer' },
            area:     { type: 'float' },

            // extra exact filters (bổ sung)
            'address.city':     { type: 'keyword', normalizer: 'kwd_fold' },
            'address.district': { type: 'keyword', normalizer: 'kwd_fold' },
            'address.ward':     { type: 'keyword', normalizer: 'kwd_fold' },
            'address.wardCode': { type: 'keyword' }
          }
        }
      }
    });

    // 2) Ensure write index + alias
    const exists = await this.es.indices.exists({ index: indexName });
    if (!exists) {
      await this.es.indices.create({ index: indexName });
    }

    // alias -> latest
    await this.es.indices.updateAliases({
      body: {
        actions: [
          { remove: { index: `${this.postsIndex}_v*`, alias: this.postsAlias, ignore_unavailable: true } },
          { add: { index: indexName, alias: this.postsAlias, is_write_index: true } }
        ]
      }
    });

    this.logger.log(`Template+Alias ready: template=${templateName}, alias=${this.postsAlias} -> ${indexName}`);
  }
}


Đăng ký service vào src/modules/search/search.module.ts:

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { esClientProvider } from './es.client';
import { AreasResolverService } from './services/areas-resolver.service';
import { LegacyAreaService } from './services/legacy-area.service';
import { SearchBootstrapService } from './search-bootstrap.service';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [ConfigModule],
  providers: [
    esClientProvider,
    AreasResolverService,
    LegacyAreaService,
    SearchBootstrapService,
    SearchService
  ],
  controllers: [SearchController],
  exports: [SearchService]
})
export class SearchModule {}

4) LegacyAreaService (đọc JSON & expand wardCode)

Tạo mới src/modules/search/services/legacy-area.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import * as path from 'node:path';

function norm(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class LegacyAreaService {
  private readonly logger = new Logger(LegacyAreaService.name);
  private map: Record<string, string[]> = {};

  constructor(private readonly config: ConfigService) {
    const p = path.resolve(process.cwd(), 'config/legacy-district-mapping.json');
    try {
      const raw = fs.readFileSync(p, 'utf-8');
      const json = JSON.parse(raw);
      if (json && typeof json === 'object') this.map = json;
      this.logger.log(`Loaded legacy mapping: ${Object.keys(this.map).length} keys`);
    } catch (e) {
      this.logger.warn(`Cannot load legacy mapping at ${p}: ${String(e)}`);
    }
  }

  expandWardCodes(cityHint: string | undefined, districtText: string | undefined): string[] {
    if (!districtText) return [];
    const cityKey = norm(cityHint || 'hcm'); // mặc định HCM nếu không có
    const key = `${cityKey.includes('ha noi') || cityKey === 'hn' ? 'hn' : 'hcm'}:${norm(districtText)}`;
    return this.map[key] || [];
  }
}

5) Bổ sung wardCode vào doc ES (indexer)

Sửa src/modules/search/search-indexer.service.ts (trích phần buildDoc)

// ... trong buildDoc(post, room)
const addr = room?.address || {};
return {
  postId: post.postId,
  title: post.title,
  description: post.description,
  type: post.postType === 'cho-thue' ? 'rent' : 'roommate',
  status: post.status,
  source: post.source,
  price: room?.price,
  area: room?.area,
  images: post.images,
  address: {
    full: addr.specificAddress ?? '',
    city: addr.provinceName ?? addr.city ?? '',
    district: addr.districtName ?? addr.district ?? '',
    ward: addr.wardName ?? addr.ward ?? '',
    wardCode: addr.wardCode ?? null    // <--- THÊM
  },
  coords: lon != null && lat != null ? { lon, lat } : null,
  createdAt: post?.createdAt ?? new Date(),
  isActive: post?.isActive !== false,
  roomId: room?.roomId
};


Không xoá gì cũ; chỉ thêm address.wardCode.

6) Ghép “legacy → wardCode” vào truy vấn

Sửa src/modules/search/search.service.ts (khi build bool.filter)

// ... imports
import { LegacyAreaService } from './services/legacy-area.service';
import { AreasResolverService } from './services/areas-resolver.service';

constructor(
  @Inject(ES_CLIENT) private readonly es: Client,
  private readonly config: ConfigService,
  private readonly areas: AreasResolverService,
  private readonly legacy: LegacyAreaService,     // <--- THÊM
) {}

async searchPosts(p: SearchPostsParams) {
  // ...
  const filters: any[] = [{ term: { isActive: true } }];
  if (p.type) filters.push({ term: { type: p.type } });

  let sort: any[] = ['_score', { createdAt: 'desc' }];

  // 1) Ưu tiên lat/lon
  if (p.lat != null && p.lon != null && p.distance) {
    filters.push({
      geo_distance: {
        distance: p.distance,
        coords: { lat: Number(p.lat), lon: Number(p.lon) }
      }
    });
    sort = ['_score', { _geo_distance: { coords: [Number(p.lon), Number(p.lat)], order: 'asc', unit: 'km' } }, { createdAt: 'desc' }];
  } else if (p.q) {
    // 2) Legacy → wardCodes
    const wardCodes = this.legacy.expandWardCodes(undefined, p.q);
    if (wardCodes.length > 0) {
      filters.push({ terms: { 'address.wardCode': wardCodes } });
    } else {
      // 3) Resolve areas (centroid/shape)
      const area = await this.areas.resolve(p.q);
      if (area?.shape) {
        filters.push({ geo_shape: { coords: { relation: 'intersects', shape: area.shape } } });
      } else if (area?.centroid) {
        filters.push({ geo_distance: { distance: p.distance ?? '4km', coords: area.centroid } });
        sort = ['_score', { _geo_distance: { coords: [area.centroid.lon, area.centroid.lat], order: 'asc', unit: 'km' } }, { createdAt: 'desc' }];
      }
    }
  }

  const must = p.q
    ? [{ multi_match: { query: p.q, fields: ['title^3', 'address.full^2', 'description'], fuzziness: 'AUTO' } }]
    : [{ match_all: {} }];

  const res = await this.es.search({
    index: this.config.get<string>('ELASTIC_ALIAS_POSTS') || 'posts_alias',
    body: {
      from, size: limit,
      query: { bool: { filter: filters, must } },
      sort,
      highlight: { fields: { title: {}, description: {}, 'address.full': {} } }
    }
  });
  // ...
}

7) ENV (thêm nếu chưa có)
ELASTIC_NODE=http://localhost:9200
ELASTIC_INDEX_POSTS=posts
ELASTIC_ALIAS_POSTS=posts_alias
ELASTIC_INDEX_AREAS=areas

8) Ghi chú chạy

Mount synonyms xong: restart ES (docker compose).

Start BE → SearchBootstrapService tự tạo template & alias.

Reindex 1 lần sang posts_v2 (route reindex bạn đã có).

Tạo/duyệt post mới → indexer sẽ ghi vào alias posts_alias (trỏ write-index).

Kỳ vọng

Người dùng gõ: “q1”, “quận 1”, “gò vấp”, “thủ đức”… →

Nếu có wardCode map: lọc terms address.wardCode (chính xác).

Nếu không: resolve areas → geo_distance/geo_shape.

Text relevance vẫn ưu tiên: lat/lon > địa danh > title/desc như bạn yêu cầu.

Không phá vỡ code cũ; chỉ bổ sung chức năng.