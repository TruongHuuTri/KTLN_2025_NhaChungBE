import { Injectable, Inject, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SearchIndexerService {
  private readonly index: string;
  private readonly logger = new Logger(SearchIndexerService.name);

  constructor(
    @Inject('ES_CLIENT') private readonly es: Client,
    private readonly cfg: ConfigService,
  ) {
    this.index = this.cfg.get<string>('ELASTIC_INDEX_POSTS') || 'posts';
  }

  buildDoc(post: any, room?: any) {
    const coords = room?.address?.location?.coordinates;
    const lon = Array.isArray(coords) ? Number(coords[0]) : undefined;
    const lat = Array.isArray(coords) ? Number(coords[1]) : undefined;

    return {
      title: post?.title ?? '',
      description: post?.description ?? '',
      category: post?.category ?? '',
      type: post?.postType ?? '',
      status: post?.status ?? '',
      source: post?.source ?? '',
      images: Array.isArray(post?.images) ? post.images : [],
      price: room?.price ?? null,
      area: room?.area ?? null,
      address: {
        full: room?.address?.specificAddress ?? '',
        city: room?.address?.provinceName ?? '',
        district: room?.address?.districtName ?? '',
        ward: room?.address?.wardName ?? '',
      },
      coords: lon != null && lat != null ? { lon, lat } : null,
      createdAt: post?.createdAt ?? new Date(),
      isActive: post?.isActive !== false,
      roomId: post?.roomId ?? null,
    };
  }

  async indexPost(post: any, room?: any) {
    const id = String(post?._id ?? post?.postId ?? post?.id);
    if (!id) return;
    try {
      const document = this.buildDoc(post, room);
      await this.es.index({ index: this.index, id, document, refresh: 'wait_for' });
    } catch (err: any) {
      this.logger.error(`Index post ${id} failed: ${err?.message || err}`);
    }
  }

  async deletePost(id: any) {
    const _id = String(id);
    try {
      await this.es.delete({ index: this.index, id: _id });
    } catch (err: any) {
      if (err?.meta?.statusCode !== 404)
        this.logger.error(`Delete post ${_id} failed: ${err?.message || err}`);
    }
  }
}


