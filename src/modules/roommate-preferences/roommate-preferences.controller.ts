import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { RoommatePreferencesService } from './roommate-preferences.service';
import { CreateRoommatePreferenceDto } from './dto/create-roommate-preference.dto';
import { UpdateRoommatePreferenceDto } from './dto/update-roommate-preference.dto';
import { FindRoommateDto } from './dto/find-roommate.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class RoommatePreferencesController {
  constructor(
    private readonly roommatePreferencesService: RoommatePreferencesService,
  ) {}

  /**
   * Lấy preference của phòng
   */
  @Get('rooms/:roomId/roommate-preference')
  async getRoommatePreference(
    @Request() req,
    @Param('roomId', ParseIntPipe) roomId: number,
  ) {
    const userId = req.user.userId;
    return this.roommatePreferencesService.getRoommatePreference(userId, roomId);
  }

  /**
   * Tạo/cập nhật preference
   */
  @Put('rooms/:roomId/roommate-preference')
  async createOrUpdateRoommatePreference(
    @Request() req,
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() preferenceData: CreateRoommatePreferenceDto | UpdateRoommatePreferenceDto,
  ) {
    const userId = req.user.userId;
    return this.roommatePreferencesService.createOrUpdateRoommatePreference(
      userId,
      roomId,
      preferenceData,
    );
  }

  /**
   * Lấy bài đăng từ roomId
   */
  @Get('rooms/:roomId/post')
  async getPostByRoomId(
    @Request() req,
    @Param('roomId', ParseIntPipe) roomId: number,
  ) {
    const userId = req.user.userId;
    return this.roommatePreferencesService.getPostByRoomId(userId, roomId);
  }

  /**
   * Lấy preferences của Seeker (User B)
   * Route: GET /api/users/me/seeker-preference (tránh conflict với GET /api/users/:id)
   */
  @Get('me/seeker-preference')
  async getSeekerPreference(@Request() req) {
    if (!req.user) {
      throw new BadRequestException('User not authenticated');
    }
    
    const userId = req.user.userId || req.user.sub;
    if (!userId) {
      throw new BadRequestException('User not found');
    }
    
    return this.roommatePreferencesService.getSeekerPreference(+userId);
  }

}

@Controller('posts/roommate')
export class PostsRoommateController {
  constructor(
    private readonly roommatePreferencesService: RoommatePreferencesService,
  ) {}


  /**
   * Tự động match với preferences đã lưu (User B vào lại, không cần điền form)
   * Route: GET /api/posts/roommate/find (tránh conflict với GET /api/posts/:id)
   */
  @Get('find')
  @UseGuards(JwtAuthGuard)
  async findRoommateAuto(@Request() req) {
    const seekerId = req.user.userId;
    return this.roommatePreferencesService.findRoommateAuto(seekerId);
  }

  /**
   * Tìm phòng ở ghép (Người thuê B điền form trên trang chủ hoặc sửa form)
   * Route: POST /api/posts/roommate/find (tránh conflict với POST /api/posts)
   */
  @Post('find')
  @UseGuards(JwtAuthGuard)
  async findRoommate(
    @Request() req,
    @Body() findRoommateDto: FindRoommateDto,
  ) {
    const seekerId = req.user.userId;
    return this.roommatePreferencesService.findRoommate(seekerId, findRoommateDto);
  }
}


