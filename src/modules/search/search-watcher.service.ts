import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { SearchIndexerService } from './search-indexer.service';

@Injectable()
export class SearchWatcherService implements OnModuleInit {
  private readonly logger = new Logger(SearchWatcherService.name);

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly indexer: SearchIndexerService,
  ) {}

  async onModuleInit() {
    this.watchPosts();
    this.watchRooms();
  }

  private async watchPosts() {
    const posts = this.conn.collection('posts');
    const rooms = this.conn.collection('rooms');
    const cs = posts.watch([], { fullDocument: 'updateLookup' });

    cs.on('change', async (chg: any) => {
      try {
        if (chg.operationType === 'insert' || chg.operationType === 'update' || chg.operationType === 'replace') {
          const post = chg.fullDocument;
          
          // CRITICAL: Nếu post không active, xóa khỏi ES ngay lập tức
          const status = post?.status ?? 'active';
          const isActive = post?.isActive !== false;
          
          if (status !== 'active' || !isActive) {
            // Post không active → xóa khỏi ES
            const postId = post?.postId;
            if (postId != null) {
              await this.indexer.deletePost(postId);
              this.logger.debug(`Deleted non-active post ${postId} from ES: status="${status}", isActive=${isActive}`);
            }
            return; // Không index post này
          }
          
          // Chỉ index posts có status="active" và isActive=true
          let room: any | null = null;
          if (post?.roomId != null) {
            room = await rooms.findOne({ roomId: post.roomId });
          }
          await this.indexer.indexPost(post, room);
        } else if (chg.operationType === 'delete') {
          const id = chg.documentKey?._id;
          await this.indexer.deletePost(id);
        }
      } catch (e: any) {
        this.logger.error(`watchPosts error: ${e?.message || e}`);
      }
    });

    cs.on('error', (e: any) => this.logger.error(`watchPosts stream error: ${e?.message || e}`));
    this.logger.log('Posts change stream started');
  }

  private async watchRooms() {
    const posts = this.conn.collection('posts');
    const rooms = this.conn.collection('rooms');
    const cs = rooms.watch([], { fullDocument: 'updateLookup' });

    cs.on('change', async (chg: any) => {
      try {
        const op = chg.operationType;
        const roomId = op === 'delete' ? chg.documentKey?.roomId ?? chg.fullDocumentBeforeChange?.roomId : chg.fullDocument?.roomId;
        if (roomId == null) return;

        const room = op === 'delete' ? null : chg.fullDocument;
        const related = await posts.find({ roomId }).toArray();
        
        // Reindex tất cả posts liên quan, nhưng chỉ index nếu post active
        await Promise.all(
          related.map(async (p: any) => {
            const status = p?.status ?? 'active';
            const isActive = p?.isActive !== false;
            
            if (status !== 'active' || !isActive) {
              // Post không active → xóa khỏi ES
              if (p?.postId != null) {
                await this.indexer.deletePost(p.postId);
                this.logger.debug(`Deleted non-active post ${p.postId} from ES (room change): status="${status}", isActive=${isActive}`);
              }
            } else {
              // Post active → reindex
              await this.indexer.indexPost(p, room);
            }
          }),
        );
      } catch (e: any) {
        this.logger.error(`watchRooms error: ${e?.message || e}`);
      }
    });

    cs.on('error', (e: any) => this.logger.error(`watchRooms stream error: ${e?.message || e}`));
    this.logger.log('Rooms change stream started');
  }
}


