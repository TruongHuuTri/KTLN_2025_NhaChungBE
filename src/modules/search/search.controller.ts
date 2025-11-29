import { Controller, Get, Query, BadRequestException, Logger } from '@nestjs/common';
import { SearchService } from './search.service';
import { GeoCodeService } from './geo-code.service';
import { ConfigService } from '@nestjs/config';
import NodeGeocoder from 'node-geocoder';

@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);
  private geocoder: NodeGeocoder.Geocoder;

  constructor(
    private readonly search: SearchService,
    private readonly geo: GeoCodeService,
    private readonly configService: ConfigService,
  ) {
    // Initialize geocoder for helper endpoint
    const geocoderOptions: NodeGeocoder.Options = {
      provider: 'mapbox',
      apiKey: this.configService.get<string>('MAPBOX_API_KEY') as string,
    };
    this.geocoder = NodeGeocoder(geocoderOptions);
  }

  // Helper: parse number với validation
  private parseNumber(value: any): number | undefined {
    if (!value) return undefined;
    const num = Number(value);
    return !isNaN(num) ? num : undefined;
  }

  // Helper: parse boolean
  private parseBoolean(value: any): boolean {
    return value === '1' || value === 'true' || value === true;
  }

  @Get('posts')
  async searchPosts(@Query() q: any) {
    return this.search.searchPosts({
      q: q.q,
      city: q.city,
      district: q.district,
      ward: q.ward,
      minPrice: this.parseNumber(q.minPrice),
      maxPrice: this.parseNumber(q.maxPrice),
      minArea: this.parseNumber(q.minArea),
      maxArea: this.parseNumber(q.maxArea),
      lat: this.parseNumber(q.lat),
      lon: this.parseNumber(q.lon),
      distance: q.distance,
      page: this.parseNumber(q.page),
      limit: this.parseNumber(q.limit),
      prefetch: this.parseNumber(q.prefetch),
      sort: q.sort,
      roommate: this.parseBoolean(q.roommate),
      searcherGender: (q.searcherGender === 'male' || q.searcherGender === 'female') ? q.searcherGender : undefined,
      province_code: q.province_code,
      district_code: q.district_code,
      ward_code: q.ward_code,
      category: q.category,
      postType: q.postType,
      amenities: q.amenities ? (Array.isArray(q.amenities) ? q.amenities : [q.amenities]) : undefined,
      excludeAmenities: q.excludeAmenities ? (Array.isArray(q.excludeAmenities) ? q.excludeAmenities : [q.excludeAmenities]) : undefined,
      excludeDistricts: q.excludeDistricts ? (Array.isArray(q.excludeDistricts) ? q.excludeDistricts : [q.excludeDistricts]) : undefined,
      // --- START: Các filter mới ---
      minBedrooms: this.parseNumber(q.minBedrooms),
      maxBedrooms: this.parseNumber(q.maxBedrooms),
      minBathrooms: this.parseNumber(q.minBathrooms),
      maxBathrooms: this.parseNumber(q.maxBathrooms),
      furniture: q.furniture,
      legalStatus: q.legalStatus,
      propertyType: q.propertyType,
      buildingName: q.buildingName,
      // --- END: Các filter mới ---
      strict: this.parseBoolean(q.strict),
      minResults: this.parseNumber(q.minResults),
    });
  }

  /**
   * Helper endpoint để geocode địa chỉ thành coordinates
   * Dùng Mapbox (đã cập nhật địa chỉ mới) thay vì Google Maps
   * 
   * @param address - Địa chỉ cần geocode (ví dụ: "123 Đường ABC, Phường XYZ, Quận 7, TP.HCM")
   * @returns Coordinates { lat, lon } hoặc null nếu không tìm thấy
   */
  @Get('geocode')
  async geocodeAddress(@Query('address') address: string) {
    if (!address || !address.trim()) {
      throw new BadRequestException('Address parameter is required');
    }

    try {
      const addressText = `${address.trim()}, Vietnam`;
      const results = await this.geocoder.geocode(addressText);
      
      if (results && results.length > 0) {
        const first = results[0];
        const lat = Number(first.latitude);
        const lon = Number(first.longitude);
        
        // Validate coordinates (HCM area: lat 10.3-11.0, lon 106.3-107.0)
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          return {
            lat,
            lon,
            formattedAddress: first.formattedAddress || address,
            confidence: first.extra?.confidence || 'medium',
          };
        }
      }
      
      this.logger.warn(`Geocode không tìm thấy coordinates cho: ${address}`);
      return null;
    } catch (error: any) {
      this.logger.error(`Geocode failed for "${address}": ${error?.message || error}`);
      return null;
    }
  }
}


