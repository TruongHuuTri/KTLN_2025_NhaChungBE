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
import { FavouritesService } from './favourites.service';
import { CreateFavouriteDto } from './dto/create-favourite.dto';
import { UpdateFavouriteDto } from './dto/update-favourite.dto';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';

@Controller('favourites')
export class FavouritesController {
  constructor(private readonly favouritesService: FavouritesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  create(@Body() createFavouriteDto: CreateFavouriteDto) {
    return this.favouritesService.create(createFavouriteDto);
  }

  @Get()
  findAll(@Query('userId') userId?: string) {
    if (userId) {
      return this.favouritesService.findByUserId(parseInt(userId));
    }
    return this.favouritesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.favouritesService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateFavouriteDto: UpdateFavouriteDto) {
    return this.favouritesService.update(id, updateFavouriteDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    this.favouritesService.remove(id);
    return { message: 'Xóa yêu thích thành công' };
  }

  @Delete('user/:userId/post/:postType/:postId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  removeByUserAndPost(
    @Param('userId') userId: string,
    @Param('postType') postType: string,
    @Param('postId') postId: string,
  ) {
    this.favouritesService.removeByUserAndPost(
      parseInt(userId),
      postType,
      parseInt(postId),
    );
    return { message: 'Xóa yêu thích thành công' };
  }

  @Post('toggle')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async toggle(@Body() body: { userId: number | string; postType: string; postId: number | string }) {
    const result = await this.favouritesService.toggle(
      Number(body.userId),
      body.postType,
      Number(body.postId)
    );
    return result;
  }
}
