import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { NlpSearchService } from './nlp-search.service';

@Controller('search')
export class NlpSearchController {
    constructor(private readonly nlpSearchService: NlpSearchService) {}

    @Get('nlp')
    async nlpSearch(@Query('q') query: string) {
        if (!query || query.trim() === '') {
            throw new HttpException(
                'Query parameter "q" cannot be empty.',
                HttpStatus.BAD_REQUEST,
            );
        }
        
        try {
            const results = await this.nlpSearchService.search(query);
            
            // DEBUG: Log response structure để kiểm tra
            console.log('[NlpSearchController] Response structure:', {
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
            
            return {
                statusCode: HttpStatus.OK,
                message: 'Search completed successfully.',
                data: results,
            };
        } catch (error: any) {
            // eslint-disable-next-line no-console
            console.error('Top-level search error:', error);
            throw new HttpException(
                error.message || 'An internal server error occurred.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}


