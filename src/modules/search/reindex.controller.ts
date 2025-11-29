import { Controller, Post, Query, Param, Inject, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { SearchIndexerService } from './search-indexer.service';

@Controller('search')
export class ReindexController {
  private readonly logger = new Logger(ReindexController.name);
  private readonly index: string;

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly indexer: SearchIndexerService,
    @Inject('ES_CLIENT') private readonly es: Client,
    private readonly cfg: ConfigService,
  ) {
    this.index = this.cfg.get<string>('ELASTIC_INDEX_POSTS') || 'posts';
  }

  /**
   * Backfill toàn bộ posts -> ES theo batch.
   * Chỉ index posts có status="active" và isActive=true.
   * Xóa tất cả pending posts khỏi ES.
   * POST /api/search/reindex/posts?limit=500
   */
  @Post('reindex/posts')
  async reindexAll(@Query('limit') limitQ?: string) {
    const limit = Math.max(1, Math.min(Number(limitQ) || 500, 2000));
    const postsColl = this.conn.collection('posts');
    const roomsColl = this.conn.collection('rooms');

    // CRITICAL: Cleanup tất cả pending posts trong ES trước
    await this.cleanupPendingPosts();

    const cursor = postsColl.find({});
    let count = 0;
    let indexed = 0;
    let skipped = 0;

    while (await cursor.hasNext()) {
      const batch: any[] = [];
      for (let i = 0; i < limit; i++) {
        const doc = await cursor.next();
        if (!doc) break;
        batch.push(doc);
      }
      if (!batch.length) break;

      // index song song theo batch
      await Promise.all(
        batch.map(async (post) => {
          try {
            const status = post?.status ?? 'active';
            const isActive = post?.isActive !== false;
            
            // Chỉ index active posts
            if (status !== 'active' || !isActive) {
              skipped++;
              // Đảm bảo xóa khỏi ES nếu có
              if (post?.postId != null) {
                await this.indexer.deletePost(post.postId);
              }
              return;
            }
            
            let room: any | null = null;
            if (post.roomId != null) {
              room = await roomsColl.findOne({ roomId: post.roomId });
            }
            await this.indexer.indexPost(post, room);
            indexed++;
          } catch (err) {
            // tiếp tục nếu lỗi
          }
        }),
      );

      count += batch.length;
      if (count % 1000 === 0) {
        this.logger.log(`[Reindex] processed: ${count}, indexed: ${indexed}, skipped: ${skipped}`);
      }
    }

    return { ok: true, processed: count, indexed, skipped };
  }

  /**
   * Cleanup: Xóa tất cả posts có status != "active" hoặc isActive != true khỏi ES
   */
  private async cleanupPendingPosts() {
    try {
      // Query tất cả documents trong ES có status != "active" hoặc isActive != true
      const resp = await this.es.search({
        index: this.index,
        size: 1000, // Batch size
        query: {
          bool: {
            should: [
              { term: { status: 'pending' } },
              { term: { status: 'inactive' } },
              { term: { status: 'rejected' } },
              { bool: { must_not: { term: { isActive: true } } } },
            ],
            minimum_should_match: 1,
          },
        },
        _source: ['postId'],
      });

      const hits = resp.hits?.hits || [];
      if (hits.length === 0) {
        this.logger.log('[Cleanup] No pending posts found in ES');
        return;
      }

      // Xóa tất cả pending posts
      await Promise.all(
        hits.map(async (h: any) => {
          try {
            await this.es.delete({
              index: this.index,
              id: h._id,
            });
          } catch (err) {
            // Ignore errors (404 means already deleted)
          }
        }),
      );

      this.logger.log(`[Cleanup] Deleted ${hits.length} pending/inactive posts from ES`);
    } catch (err: any) {
      this.logger.error(`[Cleanup] Error cleaning pending posts: ${err?.message || err}`);
    }
  }

  /**
   * Reindex tất cả posts gắn roomId
   * POST /api/search/reindex/room/:roomId
   */
  @Post('reindex/room/:roomId')
  async reindexByRoom(@Param('roomId') roomIdParam: string) {
    const roomId = Number(roomIdParam);
    const postsColl = this.conn.collection('posts');
    const roomsColl = this.conn.collection('rooms');

    const room = await roomsColl.findOne({ roomId });
    const posts = await postsColl.find({ roomId }).toArray();

    await Promise.all(posts.map(p => this.indexer.indexPost(p, room)));

    return { ok: true, processed: posts.length, roomId };
  }

  /**
   * Cleanup: Xóa tất cả pending/inactive posts khỏi ES
   * POST /api/search/cleanup/pending
   */
  @Post('cleanup/pending')
  async cleanupPending() {
    await this.cleanupPendingPosts();
    return { ok: true, message: 'Cleanup completed' };
  }
}



