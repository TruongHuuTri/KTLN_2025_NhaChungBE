import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ListReviewsQueryDto } from './dto/list-reviews.dto';
import { ListAllReviewsQueryDto } from './dto/list-all-reviews.dto';
import { VoteReviewDto } from './dto/vote-review.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { UpdateReplyDto } from './dto/update-reply.dto';
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
  list(@Query() q: ListReviewsQueryDto, @Query('userId') userId?: string) {
    return this.reviewsService.listByTarget({
      targetType: q.targetType,
      targetId: Number(q.targetId),
      rating: q.rating ? Number(q.rating) : undefined,
      hasMedia: q.hasMedia === 'true' ? true : q.hasMedia === 'false' ? false : undefined,
      sort: (q.sort as any) || 'recent',
      page: q.page ? Number(q.page) : 1,
      pageSize: q.pageSize ? Number(q.pageSize) : 10,
      userId: userId ? Number(userId) : undefined, // Optional: để check myVote
    });
  }

  @Get('all')
  listAll(@Query() q: ListAllReviewsQueryDto, @Query('userId') userId?: string) {
    return this.reviewsService.listAll({
      targetType: q.targetType,
      rating: q.rating ? Number(q.rating) : undefined,
      hasMedia: q.hasMedia === 'true' ? true : q.hasMedia === 'false' ? false : undefined,
      sort: (q.sort as any) || 'recent',
      page: q.page ? Number(q.page) : 1,
      pageSize: q.pageSize ? Number(q.pageSize) : 10,
      userId: userId ? Number(userId) : undefined, // Optional: để check myVote
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

  // Reply endpoints (Multiple replies support)
  @Post(':reviewId/replies')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  createReply(@Param('reviewId') reviewId: string, @Body() dto: CreateReplyDto) {
    return this.reviewsService.createReply(Number(reviewId), dto);
  }

  @Patch(':reviewId/replies/:replyId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  updateReply(
    @Param('reviewId') reviewId: string,
    @Param('replyId') replyId: string,
    @Body() dto: UpdateReplyDto,
  ) {
    return this.reviewsService.updateReply(Number(reviewId), Number(replyId), dto);
  }

  @Delete(':reviewId/replies/:replyId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  deleteReply(
    @Param('reviewId') reviewId: string,
    @Param('replyId') replyId: string,
    @Query('userId') userId: string,
  ) {
    return this.reviewsService.deleteReply(Number(reviewId), Number(replyId), Number(userId));
  }
}

