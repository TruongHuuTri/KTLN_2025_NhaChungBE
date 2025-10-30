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
        await Promise.all(related.map((p: any) => this.indexer.indexPost(p, room)));
      } catch (e: any) {
        this.logger.error(`watchRooms error: ${e?.message || e}`);
      }
    });

    cs.on('error', (e: any) => this.logger.error(`watchRooms stream error: ${e?.message || e}`));
    this.logger.log('Rooms change stream started');
  }
}


