import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SearchBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(SearchBootstrapService.name);
  private client: Client;
  private indexAlias: string;

  constructor(private readonly config: ConfigService) {
    const nodeUrl = this.config.get<string>('ELASTIC_NODE') ?? this.config.get<string>('ELASTIC_URL') ?? 'http://localhost:9200';
    // Đảm bảo URL là http:// không phải https://
    const httpUrl = nodeUrl.replace(/^https:\/\//, 'http://');
    
    this.client = new Client({
      node: httpUrl,
      auth: (this.config.get('ELASTIC_USERNAME') && this.config.get('ELASTIC_PASSWORD'))
        ? { username: this.config.get('ELASTIC_USERNAME') as string, password: this.config.get('ELASTIC_PASSWORD') as string }
        : undefined,
      // Bỏ header Accept vì có thể gây lỗi 400 với ES 8.x
      // ES 8.x tự động negotiate content type
      // Đảm bảo không dùng SSL
      tls: undefined,
      // Thêm timeout và retry
      requestTimeout: 5000,
      pingTimeout: 3000,
      maxRetries: 3,
    });
    this.indexAlias = this.config.get<string>('ELASTIC_INDEX_POSTS') ?? 'posts';
    this.logger.log(`ES Client initialized with URL: ${httpUrl}`);
  }

  async onModuleInit() {
    // Đợi ES sẵn sàng với retry
    const maxRetries = 10;
    const retryDelay = 2000; // 2 giây
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.client.ping();
        this.logger.log('Elasticsearch is ready');
        break;
      } catch (e: any) {
        // Chi tiết hóa ResponseError từ ES client
        let errorMsg = e?.message || e?.toString() || 'Unknown error';
        if (e?.name === 'ResponseError') {
          const statusCode = e?.statusCode || 'N/A';
          let bodyStr = 'N/A';
          if (e?.body) {
            try {
              bodyStr = typeof e.body === 'string' ? e.body.substring(0, 200) : JSON.stringify(e.body).substring(0, 200);
            } catch {
              bodyStr = String(e.body).substring(0, 200);
            }
          }
          errorMsg = `ResponseError (status: ${statusCode}, body: ${bodyStr})`;
        }
        
        if (i === maxRetries - 1) {
          this.logger.error(`Elasticsearch not ready after ${maxRetries} attempts: ${errorMsg}`);
          this.logger.error(`ES URL: ${this.config.get<string>('ELASTIC_NODE') ?? this.config.get<string>('ELASTIC_URL') ?? 'http://localhost:9200'}`);
          if (e?.stack) {
            this.logger.debug(`Stack: ${e.stack}`);
          }
          // Log nhưng không throw - app vẫn có thể chạy (search sẽ không hoạt động)
          return;
        }
        this.logger.warn(`Waiting for Elasticsearch... (${i + 1}/${maxRetries}) - ${errorMsg}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    try {
      await this.ensureTemplate();
      await this.ensureAliasAndIndex();
      this.logger.log(`Search bootstrap OK for alias: ${this.indexAlias}`);
    } catch (e: any) {
      this.logger.error(`Bootstrap failed: ${e?.message}`, e?.stack);
    }
  }

  private async ensureTemplate() {
    const templateName = 'posts_template_v1';
    try {
      const exists = await this.client.indices.existsIndexTemplate({ name: templateName }) as any;
      if (exists?.body === true || exists?.found) return;
    } catch {}

    // Load synonyms from config/synonyms.txt (inline into index settings)
    let synonyms: string[] = [];
    try {
      const synPath = path.resolve(process.cwd(), 'config', 'synonyms.txt');
      if (fs.existsSync(synPath)) {
        const raw = fs.readFileSync(synPath, 'utf8');
        synonyms = raw
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#'));
      }
    } catch {}

    const settings = {
      analysis: {
        analyzer: {
          vi_raw:        { type: 'custom', tokenizer: 'icu_tokenizer', filter: ['lowercase'] },
          vi_fold:       { type: 'custom', tokenizer: 'icu_tokenizer', filter: synonyms.length ? ['lowercase','icu_folding','vi_synonyms'] : ['lowercase','icu_folding'] },
          vi_fold_ngram: { type: 'custom', tokenizer: 'icu_tokenizer', filter: synonyms.length ? ['lowercase','icu_folding','vi_synonyms','vi_edge'] : ['lowercase','icu_folding','vi_edge'] },
        },
        filter: {
          vi_edge: { type: 'edge_ngram', min_gram: 2, max_gram: 15 },
          ...(synonyms.length
            ? { vi_synonyms: { type: 'synonym_graph', synonyms } }
            : {}),
        },
        normalizer: {
          kwd_fold: { type: 'custom', filter: ['lowercase','asciifolding'] },
        },
      },
    } as any;

    const mappings = {
      properties: {
        postId:     { type: 'integer' },
        title: {
          type: 'text',
          fields: {
            raw:  { type: 'text', analyzer: 'vi_raw',  search_analyzer: 'vi_raw' },
            fold: { type: 'text', analyzer: 'vi_fold', search_analyzer: 'vi_fold' },
            ng:   { type: 'text', analyzer: 'vi_fold_ngram', search_analyzer: 'vi_fold' },
          }
        },
        description: {
          type: 'text',
          fields: {
            raw:  { type: 'text', analyzer: 'vi_raw',  search_analyzer: 'vi_raw' },
            fold: { type: 'text', analyzer: 'vi_fold', search_analyzer: 'vi_fold' },
          }
        },
        address: {
          properties: {
            full: {
              type: 'text',
              fields: {
                raw:  { type: 'text', analyzer: 'vi_raw',  search_analyzer: 'vi_raw' },
                fold: { type: 'text', analyzer: 'vi_fold', search_analyzer: 'vi_fold' },
                ng:   { type: 'text', analyzer: 'vi_fold_ngram', search_analyzer: 'vi_fold' },
              }
            },
            city:          { type: 'keyword', normalizer: 'kwd_fold' },
            district:      { type: 'keyword', normalizer: 'kwd_fold' },
            ward:          { type: 'keyword', normalizer: 'kwd_fold' },
            provinceCode:  { type: 'keyword' },
            districtCode:  { type: 'keyword' },
            wardCode:      { type: 'keyword' },
          }
        },
        coords:    { type: 'geo_point' },
        price:     { type: 'integer' },
        area:      { type: 'float' },
        status:    { type: 'keyword' },
        type:      { type: 'keyword' },
        category:  { type: 'keyword' },
        source:    { type: 'keyword' },
        createdAt: { type: 'date' },
        isActive:  { type: 'boolean' },
        roomId:    { type: 'integer' },
        gender:    { type: 'keyword', normalizer: 'kwd_fold' },
      }
    } as any;

    await this.client.indices.putIndexTemplate({
      name: templateName,
      index_patterns: ['posts_v*'],
      template: { settings, mappings },
      priority: 500,
      _meta: { owner: 'nhachung', purpose: 'posts index with ICU' },
    });
  }

  private async ensureAliasAndIndex() {
    const alias = this.indexAlias;
    const target = `${alias}_v1`;
    const hasAlias = await this.client.indices.getAlias({ name: alias }).catch(() => null);
    if (hasAlias) return;

    const exists = await this.client.indices.exists({ index: target }) as any;
    if (!(exists?.body === true || exists === true)) {
      await this.client.indices.create({ index: target });
    }
    await this.client.indices.updateAliases({
      actions: [{ add: { alias, index: target } }]
    });
  }
}


