import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Client } from '@elastic/elasticsearch';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SearchIndexerService } from './search-indexer.service';
import { SearchWatcherService } from './search-watcher.service';
import { ReindexController } from './reindex.controller';

@Module({
  imports: [ConfigModule, MongooseModule],
  providers: [
    SearchService,
    SearchIndexerService,
    SearchWatcherService,
    {
      provide: 'ES_CLIENT',
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) =>
        new Client({
          node: cfg.get<string>('ELASTIC_URL'),
          auth:
            cfg.get('ELASTIC_USER') && cfg.get('ELASTIC_PASS')
              ? {
                  username: cfg.get<string>('ELASTIC_USER')!,
                  password: cfg.get<string>('ELASTIC_PASS')!,
                }
              : undefined,
        }),
    },
  ],
  controllers: [SearchController, ReindexController],
  exports: ['ES_CLIENT', SearchService, SearchIndexerService],
})
export class SearchModule {}


