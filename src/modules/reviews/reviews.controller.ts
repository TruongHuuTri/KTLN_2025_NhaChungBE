import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ListReviewsQueryDto } from './dto/list-reviews.dto';
import { ListAllReviewsQueryDto } from './dto/list-all-reviews.dto';
import { VoteReviewDto } from './dto/vote-review.dto';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateReviewDto) {
    // Lưu ý: dự án hiện cho phép truyền userId trong body theo style favourites
    return this.reviewsService.create({ ...dto, writerId: Number(dto.writerId) });
  }

  @Get()
  list(@Query() q: ListReviewsQueryDto) {
    return this.reviewsService.listByTarget({
      targetType: q.targetType,
      targetId: Number(q.targetId),
      rating: q.rating ? Number(q.rating) : undefined,
      hasMedia: q.hasMedia === 'true' ? true : q.hasMedia === 'false' ? false : undefined,
      sort: (q.sort as any) || 'recent',
      page: q.page ? Number(q.page) : 1,
      pageSize: q.pageSize ? Number(q.pageSize) : 10,
    });
  }

  @Get('all')
  listAll(@Query() q: ListAllReviewsQueryDto) {
    return this.reviewsService.listAll({
      targetType: q.targetType,
      rating: q.rating ? Number(q.rating) : undefined,
      hasMedia: q.hasMedia === 'true' ? true : q.hasMedia === 'false' ? false : undefined,
      sort: (q.sort as any) || 'recent',
      page: q.page ? Number(q.page) : 1,
      pageSize: q.pageSize ? Number(q.pageSize) : 10,
    });
  }

  @Get('me/written')
  @UseGuards(JwtAuthGuard)
  listWritten(@Query('userId') userId: string) {
    return this.reviewsService.listWrittenBy(Number(userId));
  }

  @Get('me/received')
  @UseGuards(JwtAuthGuard)
  listReceived(@Query('userId') userId: string) {
    return this.reviewsService.listReceivedBy(Number(userId));
  }

  @Patch(':reviewId')
  @UseGuards(JwtAuthGuard)
  update(@Param('reviewId') reviewId: string, @Query('userId') userId: string, @Body() dto: UpdateReviewDto) {
    return this.reviewsService.update(Number(reviewId), Number(userId), dto);
  }

  @Delete(':reviewId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  remove(@Param('reviewId') reviewId: string, @Query('userId') userId: string) {
    return this.reviewsService.remove(Number(reviewId), Number(userId));
  }

  @Post(':reviewId/vote')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  vote(@Param('reviewId') reviewId: string, @Query('userId') userId: string, @Body() dto: VoteReviewDto) {
    return this.reviewsService.vote(Number(reviewId), Number(userId), dto.isHelpful);
  }
}

