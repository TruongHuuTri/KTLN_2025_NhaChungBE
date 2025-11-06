import { Injectable, Inject, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';
import NodeGeocoder from 'node-geocoder';
import { GeoCodeService } from './geo-code.service';

@Injectable()
export class SearchIndexerService {
  private readonly index: string;
  private readonly logger = new Logger(SearchIndexerService.name);
  private geocoder: NodeGeocoder.Geocoder;

  constructor(
    @Inject('ES_CLIENT') private readonly es: Client,
    private readonly cfg: ConfigService,
    private readonly geo: GeoCodeService,
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

    const normalizeType = (t: any): 'rent' | 'roommate' => {
      const v = String(t ?? '').toLowerCase().trim();
      if (v === 'roommate' || v === 'o-ghep' || v === 'oghep' || v === 'og' || v === 'share' || v === 'share_room') {
        return 'roommate';
      }
      // default to rent
      if (v === 'rent' || v === 'cho-thue' || v === 'chothue' || v === 'rent_post') {
        return 'rent';
      }
      return 'rent';
    };

    const doc: any = {
      postId: post?.postId ?? null,
      title: post?.title ?? '',
      description: post?.description ?? '',
      category: post?.category ?? '',
      type: normalizeType(post?.postType ?? post?.type),
      status: post?.status ?? 'active',
      source: post?.source ?? '',
      images: Array.isArray(post?.images) ? post.images : [],
      price: Number(post?.roomInfo?.price ?? room?.price ?? post?.price ?? 0) || null,
      area: Number(post?.roomInfo?.area ?? room?.area ?? post?.area ?? 0) || null,
      address: {
        full: room?.address?.specificAddress ?? room?.address?.street ?? '',
        city: room?.address?.provinceName ?? '',
        district: room?.address?.districtName ?? '',
        ward: room?.address?.wardName ?? '',
      },
      coords: lon != null && lat != null ? { lon, lat } : null,
      createdAt: post?.createdAt ?? new Date(),
      isActive: post?.isActive !== false,
      roomId: post?.roomId ?? null,
    };

    // Enrich codes from wardName if available
    try {
      const r = this.geo.resolveWardByName(doc.address?.ward);
      if (r) {
        doc.address.provinceCode = r.provinceCode;
        doc.address.wardCode = r.wardCode;
      }
    } catch {}

    if (doc.type === 'roommate') {
      doc.gender = (post?.gender ?? 'any').toString().toLowerCase();
    }

    return doc;
  }

  async indexPost(post: any, room?: any) {
    const postId = post?.postId;
    if (postId == null) {
      this.logger.warn('Bỏ qua index vì thiếu postId.');
      return;
    }
    
    // CRITICAL: Chỉ index posts có status="active" và isActive=true
    const status = post?.status ?? 'active';
    const isActive = post?.isActive !== false;
    
    if (status !== 'active' || !isActive) {
      // Nếu post không active, xóa khỏi ES (nếu có)
      await this.deletePost(postId);
      this.logger.debug(`Bỏ qua index post ${postId}: status="${status}", isActive=${isActive}`);
      return;
    }
    
    try {
      const document = await this.buildDoc(post, room);
      document.postId = postId;
      document.status = 'active'; // Force active status
      document.isActive = true;   // Force isActive

      await this.es.index({
        index: this.index,
        id: String(postId),
        document,
        refresh: 'wait_for',
      });
      this.logger.debug(`Indexed post ${postId} successfully`);
    } catch (err: any) {
      this.logger.error(`Index post ${postId} failed: ${err?.message || err}`);
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


