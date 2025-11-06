import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get('posts')
  async searchPosts(@Query() q: any) {
    return this.search.searchPosts({
      q: q.q,
      city: q.city, district: q.district, ward: q.ward,
      minPrice: q.minPrice ? Number(q.minPrice) : undefined,
      maxPrice: q.maxPrice ? Number(q.maxPrice) : undefined,
      minArea: q.minArea ? Number(q.minArea) : undefined,
      maxArea: q.maxArea ? Number(q.maxArea) : undefined,
      lat: q.lat ? Number(q.lat) : undefined,
      lon: q.lon ? Number(q.lon) : undefined,
      distance: q.distance,
      page: q.page ? Number(q.page) : undefined,
      limit: q.limit ? Number(q.limit) : undefined,
      sort: q.sort,
      roommate: q.roommate === '1' || q.roommate === 'true',
      searcherGender: q.searcherGender === 'male' || q.searcherGender === 'female' ? q.searcherGender : undefined,
      province_code: q.province_code,
      district_code: q.district_code,
      ward_code: q.ward_code,
    });
  }
}


