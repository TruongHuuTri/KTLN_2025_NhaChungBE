import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AdminLoginDto } from './dto/admin-login.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAdminDto: CreateAdminDto) {
    // Only allow creating admin if no admin exists
    const adminExists = await this.adminService.adminExists();
    if (adminExists) {
      throw new BadRequestException('Admin đã tồn tại trong hệ thống');
    }
    
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
}
