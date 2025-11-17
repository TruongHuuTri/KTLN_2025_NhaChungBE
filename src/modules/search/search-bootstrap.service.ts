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
    const isHttps = nodeUrl.startsWith('https://');
    
    // Hỗ trợ cả API Key và Username/Password
    let auth: any = undefined;
    const apiKey = this.config.get<string>('ELASTIC_API_KEY');
    const username = this.config.get<string>('ELASTIC_USER') ?? this.config.get<string>('ELASTIC_USERNAME');
    const password = this.config.get<string>('ELASTIC_PASS') ?? this.config.get<string>('ELASTIC_PASSWORD');
    
    if (apiKey) {
      // Dùng API Key (Elastic Cloud thường dùng cách này)
      auth = { apiKey };
    } else if (username && password) {
      // Dùng Username/Password (local hoặc custom setup)
      auth = { username, password };
    }
    
    this.client = new Client({
      node: nodeUrl,
      auth,
      // Hỗ trợ cả HTTP (local) và HTTPS (Elastic Cloud)
      tls: isHttps
        ? {
            rejectUnauthorized: true, // Verify SSL certificate
          }
        : undefined,
      requestTimeout: 5000,
      pingTimeout: 3000,
      maxRetries: 3,
    });
    this.indexAlias = this.config.get<string>('ELASTIC_INDEX_POSTS') ?? 'posts';
    this.logger.log(`ES Client initialized with URL: ${nodeUrl}`);
  }

  /**
   * Kiểm tra ICU plugin có sẵn không
   * Nếu không có, THROW ERROR - ICU là BẮT BUỘC
   */
  private async checkIcuPlugin(): Promise<void> {
    try {
      // Test ICU tokenizer bằng cách analyze một đoạn text
      const testResult = await this.client.indices.analyze({
        body: {
          tokenizer: 'icu_tokenizer',
          text: 'hà nội đà nẵng',
        },
      } as any);

      if (testResult && testResult.tokens) {
        this.logger.log('✅ ICU plugin is available and working!');
        return;
      }
      // Nếu không có tokens, throw error
      throw new Error('ICU tokenizer test returned no tokens');
    } catch (error: any) {
      // ICU không có hoặc không hoạt động - THROW ERROR
      this.logger.error('');
      this.logger.error('❌❌❌ ICU PLUGIN IS REQUIRED FOR VIETNAMESE SEARCH! ❌❌❌');
      this.logger.error('');
      this.logger.error('📋 HOW TO ENABLE ICU ON ELASTIC CLOUD:');
      this.logger.error('');
      this.logger.error('   1. Go to: https://cloud.elastic.co');
      this.logger.error('   2. Click: Support → Create ticket');
      this.logger.error('   3. Subject: "Request to enable ICU Analysis Plugin"');
      this.logger.error('   4. Message: "Please enable ICU Analysis Plugin (analysis-icu) for my deployment.');
      this.logger.error('      This is required for Vietnamese text search to work properly."');
      this.logger.error('   5. Wait for Elastic Cloud support to enable it (usually 1-2 business days)');
      this.logger.error('   6. After they enable it, restart this application');
      this.logger.error('');
      this.logger.error('⚠️  Application will NOT start until ICU is enabled!');
      this.logger.error('⚠️  This is intentional - Vietnamese search requires ICU!');
      this.logger.error('');
      
      // Throw error để app không start
      throw new Error(
        'ICU plugin is required but not available. ' +
        'Please enable ICU Analysis Plugin on Elastic Cloud and restart the application. ' +
        'See logs above for instructions.'
      );
    }
  }

  async onModuleInit() {
    // Kiểm tra ICU plugin có sẵn không
    await this.checkIcuPlugin();
    
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

    // ICU plugin RẤT QUAN TRỌNG cho tiếng Việt:
    // - Tokenization tốt hơn (tách từ tiếng Việt chính xác)
    // - Folding (chuyển đổi có dấu/không dấu: "hà nội" = "ha noi")
    // - Unicode normalization
    // 
    // Lưu ý: Elastic Cloud có thể không cho phép cài plugin
    // Nếu ICU không có, sẽ fallback về standard (kém tối ưu hơn cho tiếng Việt)
    // 
    // Thử ICU trước, nếu lỗi sẽ fallback tự động
    let tokenizer = 'icu_tokenizer';
    let foldingFilter = 'icu_folding';

    const settings = {
      analysis: {
        analyzer: {
          vi_raw:        { type: 'custom', tokenizer, filter: ['lowercase'] },
          vi_fold:       { type: 'custom', tokenizer, filter: synonyms.length ? ['lowercase', foldingFilter, 'vi_synonyms'] : ['lowercase', foldingFilter] },
          vi_fold_ngram: { type: 'custom', tokenizer, filter: synonyms.length ? ['lowercase', foldingFilter, 'vi_synonyms', 'vi_edge'] : ['lowercase', foldingFilter, 'vi_edge'] },
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
        amenities: { type: 'keyword' }, // Array of amenity keys (e.g., ["ban_cong", "gym"])
        // Note: images không cần trong mappings vì không search được, chỉ index để trả về trong response
      }
    } as any;

    try {
      await this.client.indices.putIndexTemplate({
        name: templateName,
        index_patterns: ['posts_v*'],
        template: { settings, mappings },
        priority: 500,
        _meta: { owner: 'nhachung', purpose: 'posts index with ICU for Vietnamese' },
      });
      this.logger.log('✅ Template created successfully with ICU tokenizer');
    } catch (error: any) {
      // Nếu lỗi do ICU không có, THROW ERROR - ICU là BẮT BUỘC
      if (error?.message?.includes('icu_tokenizer') || 
          error?.message?.includes('icu_folding') ||
          error?.message?.includes('failed to find tokenizer')) {
        
        this.logger.error('');
        this.logger.error('❌❌❌ ICU PLUGIN IS REQUIRED FOR VIETNAMESE SEARCH! ❌❌❌');
        this.logger.error('');
        this.logger.error('📋 HOW TO ENABLE ICU ON ELASTIC CLOUD:');
        this.logger.error('');
        this.logger.error('   1. Go to: https://cloud.elastic.co');
        this.logger.error('   2. Click: Support → Create ticket');
        this.logger.error('   3. Subject: "Request to enable ICU Analysis Plugin"');
        this.logger.error('   4. Message: "Please enable ICU Analysis Plugin (analysis-icu) for my deployment.');
        this.logger.error('      This is required for Vietnamese text search to work properly."');
        this.logger.error('   5. Wait for Elastic Cloud support to enable it (usually 1-2 business days)');
        this.logger.error('   6. After they enable it, restart this application');
        this.logger.error('');
        this.logger.error('⚠️  Application will NOT start until ICU is enabled!');
        this.logger.error('⚠️  This is intentional - Vietnamese search requires ICU!');
        this.logger.error('');
        
        // Throw error để app không start
        throw new Error(
          'ICU plugin is required but not available. ' +
          'Please enable ICU Analysis Plugin on Elastic Cloud and restart the application. ' +
          'See logs above for instructions.'
        );
      } else {
        // Nếu lỗi khác, throw lại
        this.logger.error(`Failed to create template: ${error?.message}`);
        throw error;
      }
    }
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


