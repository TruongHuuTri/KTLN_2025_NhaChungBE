import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  Request,
  Query,
  ForbiddenException
} from '@nestjs/common';
import { UserProfilesService } from './user-profiles.service';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';

@Controller('user-profiles')
export class UserProfilesController {
  constructor(private readonly userProfilesService: UserProfilesService) {}

  /**
   * Tạo profile mới (không cần token - được gọi từ auth service)
   */
  @Post()
  create(@Body() createUserProfileDto: CreateUserProfileDto) {
    return this.userProfilesService.create(createUserProfileDto);
  }


  /**
   * Tạo profile cho user hiện tại (nếu chưa có)
   */
  @Post('me')
  @UseGuards(JwtAuthGuard)
  createMyProfile(@Request() req) {
    const userId = req.user.sub;
    return this.userProfilesService.create({ userId });
  }

  /**
   * Cập nhật profile của user hiện tại (sau khi đăng nhập)
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMyProfile(
    @Request() req,
    @Body() updateUserProfileDto: UpdateUserProfileDto
  ) {
    const userId = req.user.sub;
    return this.userProfilesService.update(+userId, updateUserProfileDto);
  }

  /**
   * Lấy profile của user hiện tại (sau khi đăng nhập)
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyProfile(@Request() req) {
    const userId = req.user.sub;
    return this.userProfilesService.findByUserId(+userId);
  }

  /**
   * Lấy profile theo userId
   */
  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  findByUserId(@Param('userId') userId: string, @Request() req) {
    // Kiểm tra permission: user chỉ có thể xem profile của mình hoặc admin có thể xem tất cả
    if (req.user.sub !== userId && req.user.role !== 'admin') {
      throw new ForbiddenException('Không có quyền truy cập profile này');
    }
    return this.userProfilesService.findByUserId(+userId);
  }

  /**
   * Cập nhật profile theo userId
   */
  @Patch('user/:userId')
  @UseGuards(JwtAuthGuard)
  updateByUserId(
    @Param('userId') userId: string, 
    @Body() updateUserProfileDto: UpdateUserProfileDto,
    @Request() req
  ) {
    // Kiểm tra permission: user chỉ có thể cập nhật profile của mình hoặc admin có thể cập nhật tất cả
    if (req.user.sub !== userId && req.user.role !== 'admin') {
      throw new ForbiddenException('Không có quyền cập nhật profile này');
    }
    return this.userProfilesService.update(+userId, updateUserProfileDto);
  }

  /**
   * Xóa profile theo userId
   */
  @Delete('user/:userId')
  @UseGuards(JwtAuthGuard)
  removeByUserId(@Param('userId') userId: string, @Request() req) {
    // Kiểm tra permission: user chỉ có thể xóa profile của mình hoặc admin có thể xóa tất cả
    if (req.user.sub !== userId && req.user.role !== 'admin') {
      throw new ForbiddenException('Không có quyền xóa profile này');
    }
    return this.userProfilesService.remove(+userId);
  }

  /**
   * Lấy tất cả profiles (admin)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.userProfilesService.findAll();
  }

  /**
   * Lấy profiles theo completion percentage
   */
  @Get('completion')
  @UseGuards(JwtAuthGuard)
  findByCompletion(@Query('minPercentage') minPercentage: string) {
    return this.userProfilesService.findByCompletion(+minPercentage);
  }

  /**
   * Lấy profiles theo role
   */
  @Get('role/:role')
  @UseGuards(JwtAuthGuard)
  findByRole(@Param('role') role: string) {
    return this.userProfilesService.findByRole(role);
  }
}
