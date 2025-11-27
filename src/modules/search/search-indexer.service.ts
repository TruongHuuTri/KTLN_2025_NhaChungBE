import { Injectable, Inject, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';
import NodeGeocoder from 'node-geocoder';
import { GeoCodeService } from './geo-code.service';
import { AmenitiesService } from './amenities.service';

@Injectable()
export class SearchIndexerService {
  private readonly index: string;
  private readonly logger = new Logger(SearchIndexerService.name);
  private geocoder: NodeGeocoder.Geocoder;

  constructor(
    @Inject('ES_CLIENT') private readonly es: Client,
    private readonly cfg: ConfigService,
    private readonly geo: GeoCodeService,
    private readonly amenities: AmenitiesService,
  ) {
    this.index = this.cfg.get<string>('ELASTIC_INDEX_POSTS') || 'posts';
    const geocoderOptions: NodeGeocoder.Options = {
      provider: 'mapbox',
      apiKey: this.cfg.get<string>('MAPBOX_API_KEY') as string,
    };
    this.geocoder = NodeGeocoder(geocoderOptions);
  }

  // Helper: lấy giá trị số từ nhiều nguồn (ưu tiên theo thứ tự)
  private getNumericValue(...values: any[]): number | null {
    for (const v of values) {
      const num = Number(v);
      if (!isNaN(num) && num > 0) return num;
    }
    return null;
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

    // Build full address: ưu tiên room, fallback post.roomInfo
    const buildAddress = (addr: any) => {
      if (!addr) return '';
      const specific = addr.specificAddress || addr.street || '';
      if (specific) return specific;
      const parts = [
        addr.street || '',
        addr.wardName || addr.ward || '',
        addr.districtName || '',
        addr.provinceName || addr.city || '',
      ].filter(Boolean);
      return parts.join(', ');
    };
    const fullAddress = buildAddress(room?.address) || buildAddress(post?.roomInfo?.address) || '';

    // Get images: prefer post.images, fallback to room.images
    let images: string[] = [];
    if (Array.isArray(post?.images) && post.images.length > 0) {
      images = post.images;
    } else if (Array.isArray(room?.images) && room.images.length > 0) {
      images = room.images;
    }

    // Description là của room, fallback sang post.description nếu không có room
    const description = room?.description || post?.description || '';

    const doc: any = {
      postId: post?.postId ?? null,
      title: post?.title ?? '',
      description: description,
      category: post?.category ?? '',
      type: normalizeType(post?.postType ?? post?.type),
      status: post?.status ?? 'active',
      source: post?.source ?? '',
      images: images,
      price: this.getNumericValue(post?.roomInfo?.basicInfo?.price, post?.roomInfo?.price, room?.price, post?.price),
      area: this.getNumericValue(post?.roomInfo?.basicInfo?.area, post?.roomInfo?.area, room?.area, post?.area),
      address: {
        full: fullAddress,
        city: room?.address?.provinceName || post?.roomInfo?.address?.provinceName || '',
        district: room?.address?.districtName || post?.roomInfo?.address?.districtName || '',
        ward: room?.address?.wardName || post?.roomInfo?.address?.wardName || '',
      },
      coords: lon != null && lat != null ? { lon, lat } : null,
      createdAt: post?.createdAt ?? new Date(),
      isActive: post?.isActive !== false,
      roomId: post?.roomId ?? null,
    };

    // Enrich codes: ưu tiên room, fallback post.roomInfo, cuối cùng resolve từ ward name
    try {
      const addr = room?.address || post?.roomInfo?.address;
      if (addr?.wardCode && addr?.provinceCode) {
        doc.address.provinceCode = addr.provinceCode;
        doc.address.wardCode = addr.wardCode;
      } else if (doc.address?.ward) {
        const r = this.geo.resolveWardByName(doc.address.ward);
        if (r) {
          doc.address.provinceCode = r.provinceCode;
          doc.address.wardCode = r.wardCode;
        }
      }
    } catch {}

    if (doc.type === 'roommate') {
      doc.gender = (post?.gender ?? 'any').toString().toLowerCase();
    }

    // --- START: Mở rộng document với các trường từ room ---

    // 1. Thông tin cơ bản của phòng (ưu tiên từ room, fallback post.roomInfo)
    const roomInfo = room || post?.roomInfo;
    doc.deposit = this.getNumericValue(roomInfo?.deposit);
    doc.furniture = roomInfo?.furniture || '';

    // 2. Thông tin chi tiết theo category (Chung cư / Nhà nguyên căn)
    let bedrooms = 0;
    let bathrooms = 0;
    let legalStatus = '';
    let propertyType = '';
    let buildingName = '';
    let blockOrTower = '';
    let floorNumber = 0;
    let direction = '';
    let totalFloors = 0;
    let landArea = 0;
    let usableArea = 0;

    if (room?.category === 'chung-cu' && room.chungCuInfo) {
      const info = room.chungCuInfo;
      bedrooms = info.bedrooms || 0;
      bathrooms = info.bathrooms || 0;
      legalStatus = info.legalStatus || '';
      propertyType = info.propertyType || '';
      buildingName = info.buildingName || '';
      blockOrTower = info.blockOrTower || '';
      floorNumber = info.floorNumber || 0;
      direction = info.direction || '';
    } else if (room?.category === 'nha-nguyen-can' && room.nhaNguyenCanInfo) {
      const info = room.nhaNguyenCanInfo;
      bedrooms = info.bedrooms || 0;
      bathrooms = info.bathrooms || 0;
      legalStatus = info.legalStatus || '';
      propertyType = info.propertyType || '';
      direction = info.direction || '';
      totalFloors = info.totalFloors || 0;
      landArea = info.landArea || 0;
      usableArea = info.usableArea || room.area || 0; // fallback to main area
    }

    doc.bedrooms = bedrooms;
    doc.bathrooms = bathrooms;
    doc.legalStatus = legalStatus;
    doc.propertyType = propertyType;
    doc.buildingName = buildingName;
    doc.blockOrTower = blockOrTower;
    doc.floorNumber = floorNumber;
    doc.direction = direction;
    doc.totalFloors = totalFloors;
    doc.landArea = landArea;
    doc.usableArea = usableArea > 0 ? usableArea : doc.area;

    // 3. Tách riêng description của post và room để có thể boost khác nhau
    doc.postDescription = post?.description || '';
    doc.roomDescription = room?.description || '';

    // 4. Extract amenities from post title và room description
    const titleText = doc.title || '';
    // description là của room, đã được gán ở trên
    const combinedText = `${titleText} ${doc.roomDescription}`.trim();
    if (combinedText) {
      const extractedAmenities = this.amenities.extractAmenities(combinedText);
      if (extractedAmenities.length > 0) {
        doc.amenities = extractedAmenities;
      }
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


