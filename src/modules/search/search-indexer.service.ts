import { Injectable, Inject, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';
import NodeGeocoder from 'node-geocoder';

@Injectable()
export class SearchIndexerService {
  private readonly index: string;
  private readonly logger = new Logger(SearchIndexerService.name);
  private geocoder: NodeGeocoder.Geocoder;

  constructor(
    @Inject('ES_CLIENT') private readonly es: Client,
    private readonly cfg: ConfigService,
  ) {
    this.index = this.cfg.get<string>('ELASTIC_INDEX_POSTS') || 'posts';
    const geocoderOptions: NodeGeocoder.Options = {
      provider: 'mapbox',
      apiKey: this.cfg.get<string>('MAPBOX_API_KEY') as string,
    };
    this.geocoder = NodeGeocoder(geocoderOptions);
  }

  async buildDoc(post: any, room?: any) {
    const coords = room?.address?.location?.coordinates;
    let lon = Array.isArray(coords) ? Number(coords[0]) : undefined;
    let lat = Array.isArray(coords) ? Number(coords[1]) : undefined;

    // Fallback geocode nếu thiếu toạ độ từ room
    if ((lon == null || isNaN(lon) || lat == null || isNaN(lat)) && room?.address) {
      try {
        const parts = [
          room.address?.specificAddress || room.address?.street || '',
          room.address?.wardName || room.address?.ward || '',
          room.address?.city || '',
          room.address?.provinceName || '',
        ].filter(Boolean);
        const addressText = parts.join(', ');
        if (addressText) {
          const res = await this.geocoder.geocode(`${addressText}, Vietnam`);
          if (res && res.length > 0) {
            const g = res[0];
            if (typeof g.longitude === 'number' && typeof g.latitude === 'number') {
              lon = g.longitude;
              lat = g.latitude;
              const roomIdInfo = room?.roomId != null ? `Room ${room.roomId}` : 'Room (unknown)';
              this.logger.warn(`Room thiếu coords — đã geocode fallback thành công cho ${roomIdInfo}.`);
            }
          } else if (room?.roomId != null) {
            this.logger.warn(`Room ${room.roomId} geocode fallback không tìm thấy toạ độ.`);
          }
        }
      } catch (e: any) {
        const roomIdInfo = room?.roomId != null ? `Room ${room.roomId}` : 'Room (unknown)';
        this.logger.error(`Geocode fallback lỗi cho ${roomIdInfo}: ${e?.message || e}`);
      }
    }

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
      const document = await this.buildDoc(post, room);
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


