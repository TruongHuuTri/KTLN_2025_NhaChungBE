# PHASE 3 — GEOCODING FALLBACK & ELASTICSEARCH MAPPING FIX
# Mục tiêu:
# - Đảm bảo mọi post có roomId đều được index với tọa độ hợp lệ.
# - Tự động geocode fallback nếu room chưa có address.location.
# - Thêm log cảnh báo và đảm bảo mapping geo_point trong Elasticsearch.

### 1️⃣ PATCH — src/modules/search/search-indexer.service.ts
# (Thay toàn bộ nội dung file)
# Bổ sung NodeGeocoder, fallback Mapbox geocoding, log cảnh báo.
# Không thay đổi function names hoặc các phương thức public khác.

import { Injectable, Logger } from '@nestjs/common';
import NodeGeocoder from 'node-geocoder';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class SearchIndexerService {
  private readonly logger = new Logger(SearchIndexerService.name);
  private geocoder: NodeGeocoder;

  constructor(
    private readonly es: ElasticsearchService,
    private readonly config: ConfigService,
  ) {
    const options: NodeGeocoder.Options = {
      provider: 'mapbox',
      apiKey: this.config.get<string>('MAPBOX_API_KEY')!,
    };
    this.geocoder = NodeGeocoder(options);
  }

  async buildDoc(post: any, room?: any) {
    let lon: number | undefined;
    let lat: number | undefined;

    // lấy tọa độ từ room.address.location
    const coords = room?.address?.location?.coordinates;
    if (Array.isArray(coords) && coords.length === 2) {
      lon = Number(coords[0]);
      lat = Number(coords[1]);
    }

    // ⚠ fallback nếu room thiếu tọa độ
    if ((!lon || !lat) && room?.address) {
      const addressText = [
        room.address.specificAddress,
        room.address.wardName,
        room.address.districtName,
        room.address.provinceName,
      ].filter(Boolean).join(', ');

      try {
        const result = await this.geocoder.geocode(`${addressText}, Vietnam`);
        if (result?.length > 0) {
          lon = result[0].longitude;
          lat = result[0].latitude;
          this.logger.warn(`⚠ Room ${room?.roomId} thiếu coords — đã geocode fallback thành công.`);
        } else {
          this.logger.warn(`⚠ Room ${room?.roomId} geocode fallback không tìm thấy tọa độ.`);
        }
      } catch (e) {
        this.logger.error(`Geocode fallback lỗi cho Room ${room?.roomId}: ${e.message}`);
      }
    }

    return {
      id: post._id?.toString?.() ?? post.id,
      title: post.title ?? '',
      description: post.description ?? '',
      address: {
        full: room?.address?.specificAddress ?? '',
        city: room?.address?.provinceName ?? '',
        district: room?.address?.districtName ?? '',
        ward: room?.address?.wardName ?? '',
      },
      coords: (lon != null && lat != null) ? { lon, lat } : null,
      price: post.price ?? 0,
      area: post.area ?? 0,
      type: post.type ?? '',
      category: post.category ?? '',
      status: post.status ?? '',
      createdAt: post.createdAt ?? new Date(),
      isActive: post.isActive !== false,
    };
  }

  async indexPost(post: any, room?: any) {
    const doc = await this.buildDoc(post, room);
    await this.es.index({
      index: 'posts',
      id: doc.id,
      document: doc,
    });
  }

  async deletePost(id: string) {
    try {
      await this.es.delete({ index: 'posts', id });
    } catch (err) {
      this.logger.warn(`Delete failed or doc missing: ${id}`);
    }
  }
}


### 2️⃣ TẠO MAPPING CHUẨN TRONG ELASTICSEARCH (chạy 1 lần)
# (Cursor có thể tự chạy shell, hoặc bạn dán vào terminal nếu dùng thủ công)

curl -X PUT "http://localhost:9200/posts" -H "Content-Type: application/json" -d '{
  "mappings": {
    "properties": {
      "coords": { "type": "geo_point" },
      "title": { "type": "text", "analyzer": "vi_analyzer" },
      "description": { "type": "text", "analyzer": "vi_analyzer" },
      "address.full": { "type": "text", "analyzer": "vi_analyzer" },
      "price": { "type": "integer" },
      "area": { "type": "float" },
      "isActive": { "type": "boolean" },
      "createdAt": { "type": "date" }
    }
  }
}'

### 3️⃣ KIỂM TRA SAU PATCH
# - Tạo 1 Room mới → có address.location
# - Tạo Post gắn Room → Indexer sẽ đẩy coords vào ES
# - Thử sửa Room bỏ address.location để xem log fallback xuất hiện
# - Gọi thử:
curl -G "http://localhost:3001/api/search/posts" \
  --data-urlencode "lat=10.77" \
  --data-urlencode "lon=106.7" \
  --data-urlencode "distance=3km" \
  --data-urlencode "limit=5"
