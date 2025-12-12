import { Injectable, Logger } from '@nestjs/common';
import { ParserAgent } from './parser.agent';
import { ParsedNlpQuery } from '../nlp-search/types';
import { RetrieverAgent } from './retriever.agent';
import { SearchPostsParams } from '../search/search.service';
import { mapParsedToParams } from './utils/param-mapper';
import { LocationAgent } from './location.agent';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly parser: ParserAgent,
    private readonly retriever: RetrieverAgent,
    private readonly location: LocationAgent,
  ) {}

  // Phase 1: điều phối bước PARSE (không gọi ES). Đã dùng trong NlpSearchService.
  async parse(rawQuery: string): Promise<ParsedNlpQuery | null> {
    const t0 = Date.now();
    try {
      const parsed = await this.parser.parse(rawQuery);
      const ms = Date.now() - t0;
      this.logger.debug(`parse() completed in ${ms}ms`);
      return parsed;
    } catch (e: any) {
      const ms = Date.now() - t0;
      this.logger.warn(
        `Orchestrator.parse failed in ${ms}ms: ${e?.message || e}`,
      );
      return null;
    }
  }

  // Parse + enrich location/POI in parallel
  async parseAndEnrich(rawQuery: string): Promise<ParsedNlpQuery | null> {
    const t0 = Date.now();
    try {
      const [parsed, enriched] = await Promise.all([
        this.parser.parse(rawQuery),
        this.location.enrich(rawQuery),
      ]);
      const merged: ParsedNlpQuery = {
        ...parsed,
        ...(enriched.lat != null && { lat: enriched.lat }),
        ...(enriched.lon != null && { lon: enriched.lon }),
        ...(enriched.distance && { distance: enriched.distance }),
        ...(enriched.poiKeywords && {
          poiKeywords: Array.from(
            new Set([...(parsed.poiKeywords || []), ...enriched.poiKeywords]),
          ),
        }),
      };
      this.logger.debug(`parseAndEnrich() completed in ${Date.now() - t0}ms`);
      return merged;
    } catch (e: any) {
      this.logger.warn(`parseAndEnrich failed: ${e?.message || e}`);
      return null;
    }
  }

  // Optional: end-to-end search (Parser + Retriever). Chưa wire mặc định để giữ parity.
  async searchWithParams(
    rawQuery: string,
    extraParams: Partial<SearchPostsParams> = {},
  ) {
    const t0 = Date.now();
    try {
      const parsed =
        (await this.parseAndEnrich(rawQuery)) ||
        (await this.parser.parse(rawQuery));
      const safeParsed: ParsedNlpQuery =
        parsed ||
        {
          raw: rawQuery,
          q: rawQuery?.trim()?.toLowerCase() || rawQuery,
        };
      const base = mapParsedToParams(safeParsed);
      const merged: SearchPostsParams = {
        ...base,
        ...extraParams,
      };
      const res = await this.retriever.retrieve(merged);
      this.logger.debug(`searchWithParams() completed in ${Date.now() - t0}ms`);
      return res;
    } catch (e: any) {
      this.logger.warn(`searchWithParams failed: ${e?.message || e}`);
      // Fallback: chỉ dùng extraParams
      return this.retriever.retrieve({ ...(extraParams || {}) });
    }
  }

}
