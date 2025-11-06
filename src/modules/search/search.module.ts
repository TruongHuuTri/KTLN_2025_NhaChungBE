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

@Module({
  imports: [ConfigModule, MongooseModule],
  providers: [
    SearchService,
    SearchIndexerService,
    SearchWatcherService,
    SearchBootstrapService,
    GeoCodeService,
    AmenitiesService,
    {
      provide: 'ES_CLIENT',
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const nodeUrl = cfg.get<string>('ELASTIC_NODE') ?? cfg.get<string>('ELASTIC_URL') ?? 'http://localhost:9200';
        // Đảm bảo URL là http:// không phải https://
        const httpUrl = nodeUrl.replace(/^https:\/\//, 'http://');
        
        return new Client({
          node: httpUrl,
          auth:
            cfg.get('ELASTIC_USER') && cfg.get('ELASTIC_PASS')
              ? {
                  username: cfg.get<string>('ELASTIC_USER')!,
                  password: cfg.get<string>('ELASTIC_PASS')!,
                }
              : undefined,
          // Bỏ header Accept vì có thể gây lỗi 400 với ES 8.x
          tls: undefined, // Đảm bảo không dùng SSL
          requestTimeout: 5000,
          pingTimeout: 3000,
          maxRetries: 3,
        });
      },
    },
  ],
  controllers: [SearchController, ReindexController],
  exports: ['ES_CLIENT', SearchService, SearchIndexerService, GeoCodeService, AmenitiesService],
})
export class SearchModule {}


