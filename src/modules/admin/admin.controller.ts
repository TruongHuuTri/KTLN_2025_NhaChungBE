import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminJwtGuard } from './guards/admin-jwt.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAdminDto: CreateAdminDto) {
    const admin = await this.adminService.create(createAdminDto);
    
    // Don't return password
    const { password, ...result } = (admin as any).toObject();
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() adminLoginDto: AdminLoginDto) {
    return this.adminService.login(adminLoginDto);
  }

  @Get()
  findAll() {
    return this.adminService.findAll();
  }

  @Get('me')
  @UseGuards(AdminJwtGuard)
  async getProfile(@Request() req: any) {
    const adminId = parseInt(req.admin.sub);
    return this.adminService.findOne(adminId.toString());
  }

  @Put(':id')
  @UseGuards(AdminJwtGuard)
  @HttpCode(HttpStatus.OK)
  async updateAdmin(
    @Param('id', ParseIntPipe) adminId: number,
    @Body() updateAdminDto: UpdateAdminDto,
    @Request() req: any
  ) {
    const tokenAdminId = parseInt(req.admin.sub);
    
    // If updating status (isActive), allow any admin to update any admin
    // If updating other fields, only allow updating own info
    if (updateAdminDto.isActive !== undefined) {
      // Allow any admin to update status of any admin
      return this.adminService.updateAdmin(adminId, updateAdminDto);
    } else {
      // For other fields, only allow updating own info
      if (tokenAdminId !== adminId) {
        throw new BadRequestException('Bạn chỉ có thể cập nhật thông tin của chính mình');
      }
      return this.adminService.updateAdmin(adminId, updateAdminDto);
    }
  }

  @Put(':id/change-password')
  @UseGuards(AdminJwtGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Param('id', ParseIntPipe) adminId: number,
    @Body() body: { currentPassword: string; newPassword: string },
    @Request() req: any
  ) {
    // Verify that the admin is changing their own password
    const tokenAdminId = parseInt(req.admin.sub);
    if (tokenAdminId !== adminId) {
      throw new BadRequestException('Bạn chỉ có thể đổi mật khẩu của chính mình');
    }

    return this.adminService.changePassword(adminId, body.currentPassword, body.newPassword);
  }

  // Đã bỏ vì chuyển sang S3 (không cần cleanup file system)
  // @Post('cleanup-images')
  // @UseGuards(AdminJwtGuard)
  // @HttpCode(HttpStatus.OK)
  // async cleanupImages() {
  //   return this.adminService.cleanupOldImages();
  // }
}
