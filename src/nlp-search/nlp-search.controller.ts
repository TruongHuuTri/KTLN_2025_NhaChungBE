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


