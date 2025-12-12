import { Injectable, Inject, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';
import NodeGeocoder from 'node-geocoder';
import { GeoCodeService } from './geo-code.service';
import { AmenitiesService } from './amenities.service';
import { EmbeddingService } from './embedding.service';

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
    private readonly embeddingService: EmbeddingService,
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

  // Helper: Extract building name từ text (title, address, description)
  // Pattern: "Chung cư X", "Tòa nhà X", "X Tower", "X City", "X Residence", v.v.
  private extractBuildingNameFromText(text: string): string {
    if (!text || typeof text !== 'string') return '';
    
    const normalized = text.trim();
    if (!normalized) return '';

    // Pattern 1: "Chung cư [Tên]" hoặc "chung cư [Tên]"
    const chungCuMatch = normalized.match(/(?:chung\s*c[ưu]|cc)\s+([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐa-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]+?)(?:\s|,|$|phường|quận|đường|street)/i);
    if (chungCuMatch && chungCuMatch[1]) {
      const name = chungCuMatch[1].trim();
      // Loại bỏ các từ thông thường không phải tên tòa nhà
      if (name.length > 3 && !/^(tại|ở|từ|về|cho|mua|bán|thuê|cho thuê)$/i.test(name)) {
        return name;
      }
    }

    // Pattern 2: "Tòa nhà [Tên]" hoặc "tòa nhà [Tên]"
    const toaNhaMatch = normalized.match(/(?:tòa\s*nhà|tower|building)\s+([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐa-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]+?)(?:\s|,|$|phường|quận|đường|street)/i);
    if (toaNhaMatch && toaNhaMatch[1]) {
      const name = toaNhaMatch[1].trim();
      if (name.length > 3 && !/^(tại|ở|từ|về|cho|mua|bán|thuê|cho thuê)$/i.test(name)) {
        return name;
      }
    }

    // Pattern 3: Tên tòa nhà phổ biến (Vinhomes, Masteri, Sunrise, Diamond, v.v.)
    const commonBuildings = [
      'Vinhomes', 'Masteri', 'Sunrise', 'Diamond', 'The Manor', 'The Vista', 
      'The Nassim', 'The Estella', 'The Grand', 'The Park', 'The Sun', 
      'Saigon Pearl', 'Estella', 'Grand', 'Park', 'Sun',
      'Central Park', 'Centre Point', 'City', 'Residence', 'Tower'
    ];
    
    for (const building of commonBuildings) {
      const regex = new RegExp(`\\b${building.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (regex.test(normalized)) {
        return building;
      }
    }

    // Pattern 4: Tên có chữ hoa đầu (có thể là tên riêng)
    const capitalizedMatch = normalized.match(/\b([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐa-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐa-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+)*)\b/);
    if (capitalizedMatch && capitalizedMatch[1]) {
      const name = capitalizedMatch[1].trim();
      // Chỉ lấy nếu có ít nhất 2 từ và không phải là từ thông thường
      const words = name.split(/\s+/);
      if (words.length >= 2 && name.length > 5) {
        const commonWords = ['Chung', 'Cư', 'Tòa', 'Nhà', 'Phường', 'Quận', 'Đường', 'Street', 'Vietnam'];
        const hasCommonWord = words.some(w => commonWords.includes(w));
        if (!hasCommonWord) {
          return name;
        }
      }
    }

    return '';
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

    const normalizeType = (t: any): 'cho-thue' | 'tim-o-ghep' => {
      const v = String(t ?? '').toLowerCase().trim();
      if (
        v === 'roommate' ||
        v === 'tim-o-ghep' ||
        v === 'o-ghep' ||
        v === 'oghep' ||
        v === 'og' ||
        v === 'share' ||
        v === 'share_room'
      ) {
        return 'tim-o-ghep';
      }
      // default to cho-thue
      if (
        v === 'rent' ||
        v === 'cho-thue' ||
        v === 'chothue' ||
        v === 'rent_post'
      ) {
        return 'cho-thue';
      }
      return 'cho-thue';
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
      postType: normalizeType(post?.postType ?? post?.type), // đồng bộ với type
      roommate: normalizeType(post?.postType ?? post?.type) === 'tim-o-ghep',
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
      // Nếu có wardCode mà chưa có district name, tra theo mapping legacy
      if (!doc.address.district && doc.address.wardCode) {
        const districtName = this.geo.getDistrictNameByWardCode(doc.address.wardCode);
        if (districtName) doc.address.district = districtName;
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

    // 2.1. Extract buildingName từ các nguồn khác nếu chưa có
    // Ưu tiên: chungCuInfo.buildingName > title > fullAddress > roomDescription
    if (!buildingName || buildingName.trim() === '') {
      // Thử extract từ title
      const titleBuildingName = this.extractBuildingNameFromText(post?.title || '');
      if (titleBuildingName) {
        buildingName = titleBuildingName;
      } else {
        // Thử extract từ fullAddress
        const addressBuildingName = this.extractBuildingNameFromText(fullAddress);
        if (addressBuildingName) {
          buildingName = addressBuildingName;
        } else {
          // Thử extract từ room description
          const descBuildingName = this.extractBuildingNameFromText(room?.description || '');
          if (descBuildingName) {
            buildingName = descBuildingName;
          }
        }
      }
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

      // Tạo semantic embedding cho content (title + description) nếu có.
      try {
        const roomTypeText =
          document.category === 'chung-cu'
            ? 'chung cư'
            : document.category === 'phong-tro'
            ? 'phòng trọ'
            : document.category === 'nha-nguyen-can'
            ? 'nhà nguyên căn'
            : '';

        const amenitiesText = Array.isArray(document.amenities)
          ? (document.amenities as string[]).join(', ')
          : '';

        const semanticTextParts = [
          roomTypeText,
          document.title || '',
          amenitiesText,
          document.roomDescription || document.description || '',
        ].filter(Boolean);

        const semanticText = semanticTextParts.join(' - ').trim();
        if (semanticText) {
          const embedding = await this.embeddingService.createEmbedding(semanticText, 'document');
          if (embedding && embedding.length > 0) {
            // Field này cần tồn tại trong ES mapping (dense_vector) trước khi reindex.
            document.contentEmbedding = embedding;
          }
        }
      } catch (e: any) {
        this.logger.warn(`Tạo embedding cho post ${postId} thất bại, vẫn index BM25: ${e?.message || e}`);
      }

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


