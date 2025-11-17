import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

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
      sort: q.sort,
      roommate: this.parseBoolean(q.roommate),
      searcherGender: (q.searcherGender === 'male' || q.searcherGender === 'female') ? q.searcherGender : undefined,
      province_code: q.province_code,
      district_code: q.district_code,
      ward_code: q.ward_code,
    });
  }
}


