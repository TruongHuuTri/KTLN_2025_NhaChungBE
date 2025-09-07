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
  Query,
  UseGuards,
} from '@nestjs/common';
import { RentPostsService } from './rent-posts.service';
import { CreateRentPostDto } from './dto/create-rent-post.dto';
import { UpdateRentPostDto } from './dto/update-rent-post.dto';
import { CreatePhongTroDto } from './dto/phong-tro.dto';
import { CreateChungCuDto } from './dto/chung-cu.dto';
import { CreateNhaNguyenCanDto } from './dto/nha-nguyen-can.dto';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';

@Controller('rent-posts')
export class RentPostsController {
  constructor(private readonly rentPostsService: RentPostsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  create(@Body() createRentPostDto: CreateRentPostDto) {
    return this.rentPostsService.create(createRentPostDto);
  }

  @Post('phong-tro')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  createPhongTro(@Body() createPhongTroDto: CreatePhongTroDto) {
    return this.rentPostsService.createPhongTro(createPhongTroDto);
  }

  @Post('chung-cu')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  createChungCu(@Body() createChungCuDto: CreateChungCuDto) {
    return this.rentPostsService.createChungCu(createChungCuDto);
  }

  @Post('nha-nguyen-can')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  createNhaNguyenCan(@Body() createNhaNguyenCanDto: CreateNhaNguyenCanDto) {
    return this.rentPostsService.createNhaNguyenCan(createNhaNguyenCanDto);
  }

  @Get()
  findAll(@Query('userId') userId?: string, @Query('category') category?: string) {
    if (userId) {
      return this.rentPostsService.findByUserId(parseInt(userId));
    }
    if (category) {
      return this.rentPostsService.findByCategory(category);
    }
    return this.rentPostsService.findAll();
  }

  @Get('phong-tro')
  findPhongTro(@Query('userId') userId?: string) {
    if (userId) {
      return this.rentPostsService.findByUserIdAndCategory(parseInt(userId), 'phong-tro');
    }
    return this.rentPostsService.findByCategory('phong-tro');
  }

  @Get('chung-cu')
  findChungCu(@Query('userId') userId?: string) {
    if (userId) {
      return this.rentPostsService.findByUserIdAndCategory(parseInt(userId), 'chung-cu');
    }
    return this.rentPostsService.findByCategory('chung-cu');
  }

  @Get('nha-nguyen-can')
  findNhaNguyenCan(@Query('userId') userId?: string) {
    if (userId) {
      return this.rentPostsService.findByUserIdAndCategory(parseInt(userId), 'nha-nguyen-can');
    }
    return this.rentPostsService.findByCategory('nha-nguyen-can');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rentPostsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateRentPostDto: UpdateRentPostDto) {
    return this.rentPostsService.update(id, updateRentPostDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    this.rentPostsService.remove(id);
    return { message: 'Xóa bài đăng thuê phòng thành công' };
  }
}
