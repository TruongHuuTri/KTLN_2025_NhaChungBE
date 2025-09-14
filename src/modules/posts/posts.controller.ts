import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { LandlordGuard } from '../users/guards/landlord.guard';
import { AdminJwtGuard } from '../admin/guards/admin-jwt.guard';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { SearchPostsDto } from './dto/search-posts.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // Public endpoints
  @Get()
  async getPosts(@Query() filters: SearchPostsDto) {
    return this.postsService.getPosts(filters);
  }

  @Get('search')
  async searchPosts(@Query() searchFilters: SearchPostsDto) {
    return this.postsService.searchPosts(searchFilters);
  }

  @Get(':id')
  async getPostById(@Param('id') postId: number) {
    return this.postsService.getPostById(postId);
  }

  @Get(':id/with-room')
  async getPostWithRoomInfo(@Param('id') postId: number) {
    return this.postsService.getPostWithRoomInfo(postId);
  }

  // Protected endpoints
  @Get('user/rooms')
  @UseGuards(JwtAuthGuard)
  async getUserRooms(@Request() req) {
    const userId = req.user.userId;
    return this.postsService.getUserRooms(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPost(@Request() req, @Body() postData: CreatePostDto) {
    const userId = req.user.userId;
    return this.postsService.createPost(userId, postData);
  }

  @Get('user/my-posts')
  @UseGuards(JwtAuthGuard)
  async getMyPosts(@Request() req) {
    const userId = req.user.userId;
    return this.postsService.getPostsByUser(userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updatePost(@Request() req, @Param('id') postId: number, @Body() updateData: UpdatePostDto) {
    // TODO: Add authorization check to ensure user owns the post
    return this.postsService.updatePost(postId, updateData);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletePost(@Request() req, @Param('id') postId: number) {
    // TODO: Add authorization check to ensure user owns the post
    return this.postsService.deletePost(postId);
  }

  // Admin endpoints
  @Put(':id/status')
  @UseGuards(AdminJwtGuard)
  async updatePostStatus(@Param('id') postId: number, @Body() body: { status: string }) {
    return this.postsService.updatePostStatus(postId, body.status);
  }
}

@Controller('landlord/posts')
@UseGuards(JwtAuthGuard, LandlordGuard)
export class LandlordPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async getLandlordPosts(@Request() req) {
    const landlordId = req.user.userId;
    return this.postsService.getPostsByLandlord(landlordId);
  }

  @Get('room/:roomId')
  async getPostsByRoom(@Param('roomId') roomId: number) {
    return this.postsService.getPostsByRoom(roomId);
  }
}
