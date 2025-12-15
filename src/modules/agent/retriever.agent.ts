import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SearchService, SearchPostsParams } from '../search/search.service';
import { RerankAgent, RerankItem } from './rerank.agent';
import {
  RERANK_TOPK,
  DIVERSIFY_MAX_PER_BUILDING,
  DIVERSIFY_MAX_PER_ROOM,
  POP_BOOST_ALPHA,
} from '../../config/search.flags';
import Redis from 'ioredis';

@Injectable()
export class RetrieverAgent {
  private readonly logger = new Logger(RetrieverAgent.name);
  private readonly rerankTopK: number;
  private readonly diversifyByRoomMax: number;
  private readonly diversifyByBuildingMax: number;
  private readonly redis: Redis;
  // Circuit breaker for rerank
  private cbDisabledUntil = 0; // timestamp ms until rerank disabled
  private readonly cbWindow = 5 * 60 * 1000; // 5 minutes window
  private readonly cbCooldown = 10 * 60 * 1000; // 10 minutes cooldown
  private readonly cbFailThreshold = 3;
  private cbFailures: number[] = [];

  constructor(
    private readonly search: SearchService,
    private readonly cfg: ConfigService,
    private readonly rerankAgent: RerankAgent,
  ) {
    // Flagless: always attempt rerank/popularity with auto-gating via timeouts and circuit breaker
    // In-code tuning constants for simplicity and reviewability
    this.rerankTopK = RERANK_TOPK;
    this.diversifyByRoomMax = DIVERSIFY_MAX_PER_ROOM;
    this.diversifyByBuildingMax = DIVERSIFY_MAX_PER_BUILDING;

    const redisUrl = this.cfg.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
    } else {
      const host = this.cfg.get<string>('REDIS_HOST') || 'localhost';
      const port = Number(this.cfg.get<number>('REDIS_PORT')) || 6379;
      this.redis = new Redis({ host, port });
    }
  }

  private toRerankItem(x: any): RerankItem {
    return {
      id: String(x.id ?? x.postId ?? ''),
      postId: x.postId,
      title: x.title,
      roomDescription: x.roomDescription,
      postDescription: x.postDescription,
      address: x.address,
      category: x.category,
      price: x.price,
      area: x.area,
      amenities: Array.isArray(x.amenities) ? x.amenities : [],
    };
  }

  private diversify(items: any[]): {
    items: any[];
    stats: {
      input: number;
      output: number;
      trimmedRoom: number;
      trimmedBuilding: number;
    };
  } {
    if (!items || items.length === 0) {
      return {
        items,
        stats: {
          input: items?.length || 0,
          output: items?.length || 0,
          trimmedRoom: 0,
          trimmedBuilding: 0,
        },
      };
    }
    const byRoom = new Map<any, number>();
    const byBuilding = new Map<string, number>();
    const out: any[] = [];
    let trimmedRoom = 0;
    let trimmedBuilding = 0;
    for (const it of items) {
      const roomId = it.roomId ?? null;
      const bld = (it.buildingName || '').toString().trim().toLowerCase();
      const roomCnt = roomId != null ? byRoom.get(roomId) || 0 : 0;
      const bldCnt = bld ? byBuilding.get(bld) || 0 : 0;
      if (roomId != null && roomCnt >= this.diversifyByRoomMax) {
        trimmedRoom += 1;
        continue;
      }
      if (bld && bldCnt >= this.diversifyByBuildingMax) {
        trimmedBuilding += 1;
        continue;
      }
      if (roomId != null) byRoom.set(roomId, roomCnt + 1);
      if (bld) byBuilding.set(bld, bldCnt + 1);
      out.push(it);
    }
    return {
      items: out,
      stats: {
        input: items.length,
        output: out.length,
        trimmedRoom,
        trimmedBuilding,
      },
    };
  }

  private async applyPopularityBoost(items: any[]): Promise<{
    items: any[];
    stats: { boosted: number; roomHits: number; postHits: number };
  }> {
    const stats = { boosted: 0, roomHits: 0, postHits: 0 };
    if (!items?.length) return { items, stats };
    try {
      // Gather roomIds and postIds
      const roomIds: string[] = [];
      const postIds: string[] = [];
      for (const it of items) {
        if (it?.roomId != null) roomIds.push(String(it.roomId));
        else if (it?.postId != null) postIds.push(String(it.postId));
      }
      const boosts = new Map<string, number>();
      // HMGET for rooms
      if (roomIds.length) {
        const vals = await this.redis.hmget('pop:rooms:7d', ...roomIds);
        roomIds.forEach((rid, idx) => {
          const cnt = Number(vals?.[idx] || 0);
          if (cnt > 0) {
            stats.roomHits += 1;
            boosts.set(`room:${rid}`, Math.log(1 + cnt) * POP_BOOST_ALPHA);
          }
        });
      }
      // HMGET for posts
      if (postIds.length) {
        const vals = await this.redis.hmget('pop:posts:7d', ...postIds);
        postIds.forEach((pid, idx) => {
          const cnt = Number(vals?.[idx] || 0);
          if (cnt > 0) {
            stats.postHits += 1;
            boosts.set(`post:${pid}`, Math.log(1 + cnt) * POP_BOOST_ALPHA);
          }
        });
      }
      if (boosts.size === 0) return { items, stats };
      // Stable re-order: sort by boost desc, keep original order as tie-breaker
      const withOrder = items.map((it, i) => {
        const b =
          it?.roomId != null
            ? boosts.get(`room:${String(it.roomId)}`) || 0
            : boosts.get(`post:${String(it.postId)}`) || 0;
        return { it, i, b };
      });
      withOrder.sort((a, b) => b.b - a.b || a.i - b.i);
      stats.boosted = withOrder.filter((x) => x.b > 0).length;
      return { items: withOrder.map((x) => x.it), stats };
    } catch (e: any) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn(
          '[RetrieverAgent] popularity boost failed:',
          e?.message || e,
        );
      }
      return { items, stats };
    }
  }

  private recordRerankFailure() {
    const now = Date.now();
    // Remove old failures outside window
    this.cbFailures = this.cbFailures.filter((t) => now - t <= this.cbWindow);
    this.cbFailures.push(now);
    if (this.cbFailures.length >= this.cbFailThreshold) {
      this.cbDisabledUntil = now + this.cbCooldown;
      this.cbFailures = [];
    }
  }

  async retrieve(params: SearchPostsParams) {
    const tSearch = Date.now();
    const res = await this.search.searchPosts(params);
    const searchMs = Date.now() - tSearch;

    // Conditions to run rerank: có text query và có item
    const hasTextQuery = !!(params.q && params.q.trim());
    if (!hasTextQuery || !res?.items?.length) return res;

    // Nếu query ngắn + đã có cấu trúc (giá/địa lý) thì bỏ qua rerank để giảm latency
    const tokenCount = params.q ? params.q.trim().split(/\s+/).length : 0;
    const hasPriceFilter = params.minPrice != null || params.maxPrice != null;
    const hasGeoFilter =
      (Array.isArray((params as any).exactWardCodes) &&
        (params as any).exactWardCodes.length > 0) ||
      (Array.isArray((params as any).expandedWardCodes) &&
        (params as any).expandedWardCodes.length > 0);
    const hasCategory = !!params.category;
    const isSimpleStructured =
      tokenCount > 0 &&
      tokenCount <= 6 &&
      (hasPriceFilter || hasGeoFilter || hasCategory);
    // Với truy vấn ngắn (<=8 token) ưu tiên bỏ rerank để tránh gọi AI cho case đơn giản
    const forceSkipRerankByLength = tokenCount > 0 && tokenCount <= 8;

    // Circuit breaker: skip rerank if disabled temporarily
    const now = Date.now();
    const cbActive = this.cbDisabledUntil > now;

    const debugTimings = {
      searchMs,
      rerankMs: 0,
      popularityMs: 0,
      diversifyMs: 0,
    };
    const debugStats: any = {
      popularity: { boosted: 0, roomHits: 0, postHits: 0 },
      diversify: { input: 0, output: 0, trimmedRoom: 0, trimmedBuilding: 0 },
    };
    try {
      // Build a window from current page + prefetch pages (if any)
      const windowItems: any[] = [
        ...(res.items || []),
        ...(res.prefetch || []).flatMap((p: any) => p.items || []),
      ];
      if (windowItems.length === 0) return res;

      let newWindow: any[] = windowItems;

      let rerankApplied = false;
      const shouldRerank =
        !cbActive &&
        windowItems.length > 12 &&
        !isSimpleStructured &&
        !forceSkipRerankByLength;
      if (shouldRerank) {
        const topK = Math.min(this.rerankTopK, windowItems.length);
        const rrItems: RerankItem[] = windowItems.map((x) =>
          this.toRerankItem(x),
        );
        const rerankStart = Date.now();
        const reranked = await this.rerankAgent.rerank(
          params.q as string,
          rrItems,
          topK,
          1500,
        );
        debugTimings.rerankMs = Date.now() - rerankStart;
        rerankApplied = true;

        // Map back to original rich items by aligning ids (keep order from reranked)
        const byId = new Map<string, any>();
        for (const it of windowItems)
          byId.set(String(it.id ?? it.postId ?? ''), it);
        newWindow = [];
        for (const r of reranked) {
          const rich = byId.get(String(r.id));
          if (rich) newWindow.push(rich);
        }
      }

      // Popularity boost
      const popStart = Date.now();
      const popResult = await this.applyPopularityBoost(newWindow);
      debugTimings.popularityMs = Date.now() - popStart;
      debugStats.popularity = popResult.stats;
      newWindow = popResult.items;

      // Diversify results to avoid duplicates dominating the top
      const divStart = Date.now();
      const diversifiedResult = this.diversify(newWindow);
      debugTimings.diversifyMs = Date.now() - divStart;
      debugStats.diversify = diversifiedResult.stats;
      const diversified = diversifiedResult.items;

      // Re-slice back into pages using original page size and prefetch count
      // Nếu không có limit (limit = 0 hoặc undefined), trả về tất cả items
      const requestedLimit =
        params.limit !== undefined ? Number(params.limit) : undefined;
      const hasLimit = requestedLimit !== undefined && requestedLimit !== 0;
      const pageSize = hasLimit
        ? requestedLimit!
        : res.limit !== undefined
          ? Number(res.limit)
          : diversified.length;

      // Nếu không có limit, trả về tất cả items, không slice
      const shouldReturnAll =
        !hasLimit && (requestedLimit === 0 || requestedLimit === undefined);
      const prefetchCount = Array.isArray(res.prefetch)
        ? res.prefetch.length
        : 0;

      const firstPage = shouldReturnAll
        ? diversified
        : diversified.slice(0, pageSize);
      const newPrefetch: any[] = [];
      // Chỉ tạo prefetch nếu có limit và còn dữ liệu
      if (!shouldReturnAll) {
        for (let i = 0; i < prefetchCount; i++) {
          const start = (i + 1) * pageSize;
          const end = start + pageSize;
          const slice = diversified.slice(start, end);
          if (slice.length === 0) break;
          newPrefetch.push({ page: (res.page || 1) + (i + 1), items: slice });
        }
      }

      const out = {
        ...res,
        items: firstPage,
        limit: shouldReturnAll ? firstPage.length : pageSize, // Trả về limit thực tế
        prefetch: newPrefetch,
        ...(process.env.NODE_ENV === 'development' && {
          _debug: {
            ...(res as any)._debug,
            rerankApplied: rerankApplied && !cbActive,
            rerankCircuitOpen: cbActive,
            rerankTopK: !cbActive
              ? Math.min(this.rerankTopK, windowItems.length)
              : 0,
            timings: debugTimings,
            popularity: debugStats.popularity,
            diversified: {
              roomMax: this.diversifyByRoomMax,
              buildingMax: this.diversifyByBuildingMax,
              ...debugStats.diversify,
            },
          },
        }),
      };
      return out;
    } catch (e: any) {
      this.recordRerankFailure();
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn(
          '[RetrieverAgent] Rerank path failed, fallback original:',
          e?.message || e,
        );
      }
      return res; // graceful fallback
    }
  }
}
