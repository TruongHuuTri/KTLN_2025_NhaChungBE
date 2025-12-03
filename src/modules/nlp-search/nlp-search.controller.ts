import { Controller, Get, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { NlpSearchService } from './nlp-search.service';

@Controller('search')
export class NlpSearchController {
    private readonly logger = new Logger(NlpSearchController.name);

    constructor(private readonly nlpSearchService: NlpSearchService) {}

    // Helper: parse number với validation
    private parseNumber(value: any): number | undefined {
        if (value === undefined || value === null || value === '') return undefined;
        const num = Number(value);
        return !isNaN(num) ? num : undefined;
    }

    // Helper: parse boolean
    private parseBoolean(value: any): boolean {
        return value === '1' || value === 'true' || value === true;
    }

    /**
     * Unified Search API cho FE.
     * 
     * GET /search?q=...
     * - Nếu có q: dùng NLP + BM25 + (tự động Hybrid Vector).
     * - Nếu không có q nhưng có filters: dùng BM25 + filters (từ chips FE gửi).
     * - Nếu không có cả q và filters: trả lỗi.
     */
    @Get()
    async nlpSearch(@Query() q: any) {
        const query = q.q?.trim() || '';
        
        try {
            const extraParams = {
                // Điều khiển phân trang & sort
                page: this.parseNumber(q.page),
                limit: this.parseNumber(q.limit),
                prefetch: this.parseNumber(q.prefetch),
                sort: q.sort,

                // Soft ranking controls
                strict: this.parseBoolean(q.strict),
                minResults: this.parseNumber(q.minResults),

                // Personalization (nếu FE gửi kèm userId)
                userId: this.parseNumber(q.userId),

                // Cho phép override một số filter nếu FE gửi trực tiếp (ưu tiên cao hơn NLP)
                minPrice: this.parseNumber(q.minPrice),
                maxPrice: this.parseNumber(q.maxPrice),
                minArea: this.parseNumber(q.minArea),
                maxArea: this.parseNumber(q.maxArea),
                lat: this.parseNumber(q.lat),
                lon: this.parseNumber(q.lon),
                distance: q.distance,
                category: q.category,
                postType: q.postType,
                province_code: q.province_code,
                district: q.district,
                ward: q.ward,
                ward_code: q.ward_code,
                amenities: q.amenities ? (Array.isArray(q.amenities) ? q.amenities : [q.amenities]) : undefined,
                excludeAmenities: q.excludeAmenities ? (Array.isArray(q.excludeAmenities) ? q.excludeAmenities : [q.excludeAmenities]) : undefined,
                excludeDistricts: q.excludeDistricts ? (Array.isArray(q.excludeDistricts) ? q.excludeDistricts : [q.excludeDistricts]) : undefined,
                minBedrooms: this.parseNumber(q.minBedrooms),
                maxBedrooms: this.parseNumber(q.maxBedrooms),
                minBathrooms: this.parseNumber(q.minBathrooms),
                maxBathrooms: this.parseNumber(q.maxBathrooms),
                furniture: q.furniture,
                legalStatus: q.legalStatus,
                propertyType: q.propertyType,
                buildingName: q.buildingName,
            };

            const results = await this.nlpSearchService.searchWithParams(query, extraParams);
            
            // DEBUG: Log response structure để kiểm tra (chỉ trong dev mode)
            if (process.env.NODE_ENV === 'development') {
                this.logger.debug('[NlpSearchController] Response structure:', {
                    total: results.total,
                    itemsCount: results.items?.length || 0,
                    firstItemKeys: results.items?.[0] ? Object.keys(results.items[0]) : [],
                    firstItemSample: results.items?.[0] ? {
                        id: results.items[0].id,
                        postId: results.items[0].postId,
                        title: results.items[0].title?.substring(0, 50),
                        hasHighlight: !!results.items[0].highlight,
                        highlightKeys: results.items[0].highlight ? Object.keys(results.items[0].highlight) : [],
                    } : null,
                });
            }
            
            return {
                statusCode: HttpStatus.OK,
                message: 'Search completed successfully.',
                data: results,
            };
        } catch (error: any) {
            this.logger.error('Top-level search error:', error);
            throw new HttpException(
                error.message || 'An internal server error occurred.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}


