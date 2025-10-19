import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminJwtGuard } from '../admin/guards/admin-jwt.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }


  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.usersService.login(loginDto);
  }

  @Post(':id/change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  changePassword(@Param('id') id: string, @Body() changePasswordDto: ChangePasswordDto) {
    return this.usersService.changePassword(parseInt(id), changePasswordDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('admin')
  @UseGuards(AdminJwtGuard)
  async findAllForAdmin() {
    // Admin can see all users (including inactive ones)
    return this.usersService.findAllForAdmin();
  }

  @Put('admin/:id/status')
  @UseGuards(AdminJwtGuard)
  @HttpCode(HttpStatus.OK)
  async updateUserStatus(@Param('id') userId: string, @Body() body: { isActive: boolean }) {
    return this.usersService.updateUserStatus(userId, body.isActive);
  }

  @Post('admin/:id/reset-password')
  @UseGuards(AdminJwtGuard)
  @HttpCode(HttpStatus.OK)
  async resetUserPassword(@Param('id') userId: string) {
    return this.usersService.resetUserPassword(userId);
  }

  @Get('me/verification')
  @UseGuards(JwtAuthGuard)
  async getMyVerification(@Request() req: any) {
    return this.usersService.getVerificationStatus(req.user.sub);
  }

  @Get('profile/:id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get('rooms')
  @UseGuards(JwtAuthGuard)
  async getMyRooms(@Request() req) {
    const userId = req.user.userId;
    return await this.usersService.getMyRooms(userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    this.usersService.remove(id);
    return { message: 'Xóa user thành công' };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUserById(@Param('id') id: string) {
    // Check if id is numeric, if not, it might be a different route
    if (isNaN(Number(id))) {
      // Don't throw error, let other routes handle it
      throw new BadRequestException('User not found');
    }
    return this.usersService.findOne(id);
  }
}

