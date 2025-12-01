import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Client } from '@elastic/elasticsearch';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SearchIndexerService } from './search-indexer.service';
import { SearchWatcherService } from './search-watcher.service';
import { ReindexController } from './reindex.controller';
import { SearchBootstrapService } from './search-bootstrap.service';
import { GeoCodeService } from './geo-code.service';
import { AmenitiesService } from './amenities.service';
import { EmbeddingService } from './embedding.service';

@Module({
  imports: [ConfigModule, MongooseModule],
  providers: [
    SearchService,
    SearchIndexerService,
    SearchWatcherService,
    SearchBootstrapService,
    GeoCodeService,
    AmenitiesService,
    EmbeddingService,
    {
      provide: 'ES_CLIENT',
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const nodeUrl = cfg.get<string>('ELASTIC_NODE') ?? cfg.get<string>('ELASTIC_URL') ?? 'http://localhost:9200';
        const isHttps = nodeUrl.startsWith('https://');
        
        // Hỗ trợ cả API Key và Username/Password
        let auth: any = undefined;
        const apiKey = cfg.get<string>('ELASTIC_API_KEY');
        const username = cfg.get<string>('ELASTIC_USER');
        const password = cfg.get<string>('ELASTIC_PASS');
        
        if (apiKey) {
          // Dùng API Key (có thể là encoded base64 hoặc id:key format)
          // Client sẽ tự xử lý cả 2 format
          auth = { apiKey };
        } else if (username && password) {
          // Dùng Username/Password (local hoặc custom setup)
          auth = { username, password };
        }
        
        return new Client({
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
      },
    },
  ],
  controllers: [SearchController, ReindexController],
  exports: ['ES_CLIENT', SearchService, SearchIndexerService, GeoCodeService, AmenitiesService, EmbeddingService],
})
export class SearchModule {}


