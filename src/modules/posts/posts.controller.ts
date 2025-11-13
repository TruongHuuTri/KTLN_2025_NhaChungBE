import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
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

  @Get('user/rooms')
  @UseGuards(JwtAuthGuard)
  async getUserRooms(@Request() req, @Query('postType') postType?: string) {
    return this.postsService.getUserRooms(req.user.userId, postType);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPost(@Request() req, @Body() postData: CreatePostDto) {
    // Chặn tenant tạo bài đăng ở ghép thủ công
    // Cho phép nếu source là 'roommate_preference' (tự động tạo từ hệ thống)
    if (postData.postType === 'tim-o-ghep' && req.user.role !== 'landlord') {
      // Chỉ cho phép nếu là tự động tạo từ hệ thống
      if (postData.source !== 'roommate_preference' && postData.isManaged !== true) {
        throw new ForbiddenException('Bạn không thể đăng tin ở ghép thủ công. Hệ thống sẽ tự động tạo bài đăng khi bạn muốn tìm người ở ghép.');
      }
    }
    return this.postsService.createPost(req.user.userId, postData);
  }

  @Get('user/my-posts')
  @UseGuards(JwtAuthGuard)
  async getMyPosts(@Request() req) {
    return this.postsService.getPostsByUser(req.user.userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updatePost(@Request() req, @Param('id') postId: number, @Body() updateData: UpdatePostDto) {
    return this.postsService.updatePost(postId, updateData);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletePost(@Request() req, @Param('id') postId: number) {
    return this.postsService.deletePost(postId);
  }

  @Put(':id/status')
  @UseGuards(AdminJwtGuard)
  async updatePostStatus(@Param('id') postId: number, @Body() body: { status: string }) {
    return this.postsService.updatePostStatus(postId, body.status);
  }
}

@Controller('admin/posts')
@UseGuards(AdminJwtGuard)
export class AdminPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async getAllPosts(@Query() filters: any) {
    return this.postsService.getAllPostsForAdmin(filters);
  }

  @Get('pending')
  async getPendingPosts() {
    return this.postsService.getPendingPosts();
  }

  @Put(':id/approve')
  async approvePost(@Param('id') postId: string) {
    return this.postsService.updatePostStatus(parseInt(postId), 'active');
  }

  @Put(':id/reject')
  async rejectPost(@Param('id') postId: string, @Body() body: { reason?: string } = {}) {
    return this.postsService.rejectPost(parseInt(postId), body?.reason);
  }

}

@Controller('landlord/posts')
@UseGuards(JwtAuthGuard, LandlordGuard)
export class LandlordPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async getLandlordPosts(@Request() req) {
    return this.postsService.getPostsByLandlord(req.user.userId);
  }

  @Get('room/:roomId')
  async getPostsByRoom(@Param('roomId') roomId: number) {
    return this.postsService.getPostsByRoom(roomId);
  }
}
