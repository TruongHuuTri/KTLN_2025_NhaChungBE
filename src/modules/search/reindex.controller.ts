import { Controller, Post, Query, Param } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { SearchIndexerService } from './search-indexer.service';

@Controller('search')
export class ReindexController {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly indexer: SearchIndexerService,
  ) {}

  /**
   * Backfill toàn bộ posts -> ES theo batch.
   * POST /api/search/reindex/posts?limit=500
   */
  @Post('reindex/posts')
  async reindexAll(@Query('limit') limitQ?: string) {
    const limit = Math.max(1, Math.min(Number(limitQ) || 500, 2000));
    const postsColl = this.conn.collection('posts');
    const roomsColl = this.conn.collection('rooms');

    const cursor = postsColl.find({});
    let count = 0;

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
            let room: any | null = null;
            if (post.roomId != null) {
              room = await roomsColl.findOne({ roomId: post.roomId });
            }
            await this.indexer.indexPost(post, room);
          } catch (err) {
            // tiếp tục nếu lỗi
          }
        }),
      );

      count += batch.length;
      if (count % 1000 === 0) {
        // eslint-disable-next-line no-console
        console.log(`[Reindex] processed: ${count}`);
      }
    }

    return { ok: true, processed: count };
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
}


