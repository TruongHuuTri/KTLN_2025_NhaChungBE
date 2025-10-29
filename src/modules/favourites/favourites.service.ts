import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Favourite, FavouriteDocument } from './schemas/favourite.schema';
import { CreateFavouriteDto } from './dto/create-favourite.dto';
import { UpdateFavouriteDto } from './dto/update-favourite.dto';

@Injectable()
export class FavouritesService {
  constructor(
    @InjectModel(Favourite.name) private favouriteModel: Model<FavouriteDocument>,
  ) {}

  async create(createFavouriteDto: CreateFavouriteDto): Promise<Favourite> {
    // Check if favourite already exists
    const existingFavourite = await this.favouriteModel.findOne({
      userId: parseInt(createFavouriteDto.userId),
      postType: createFavouriteDto.postType,
      postId: parseInt(createFavouriteDto.postId),
    });

    if (existingFavourite) {
      throw new ConflictException('Bài đăng đã có trong danh sách yêu thích');
    }

    const nextFavouriteId = await this.getNextFavouriteId();
    
    const createdFavourite = new this.favouriteModel({
      ...createFavouriteDto,
      userId: parseInt(createFavouriteDto.userId),
      postId: parseInt(createFavouriteDto.postId),
      favouriteId: nextFavouriteId,
    });

    return createdFavourite.save();
  }

  async findAll(): Promise<Favourite[]> {
    return this.favouriteModel.find().exec();
  }

  async findOne(id: string): Promise<Favourite> {
    const favourite = await this.favouriteModel.findOne({ favouriteId: parseInt(id) }).exec();
    if (!favourite) {
      throw new NotFoundException('Không tìm thấy yêu thích');
    }
    return favourite;
  }

  async findByUserId(userId: number): Promise<Favourite[]> {
    return this.favouriteModel.find({ userId }).exec();
  }

  async findByUserAndPost(userId: number, postType: string, postId: number): Promise<Favourite | null> {
    return this.favouriteModel.findOne({ userId, postType, postId }).exec();
  }

  async toggle(userId: number, postType: string, postId: number): Promise<{ action: 'added' | 'removed'; favourite?: Favourite }> {
    const existing = await this.findByUserAndPost(userId, postType, postId);
    if (existing) {
      await this.removeByUserAndPost(userId, postType, postId);
      return { action: 'removed' };
    }
    const nextFavouriteId = await this.getNextFavouriteId();
    const createdFavourite = new this.favouriteModel({
      favouriteId: nextFavouriteId,
      userId,
      postType,
      postId,
    });
    const favourite = await createdFavourite.save();
    return { action: 'added', favourite };
  }

  async update(id: string, updateFavouriteDto: UpdateFavouriteDto): Promise<Favourite> {
    const updatedFavourite = await this.favouriteModel
      .findOneAndUpdate(
        { favouriteId: parseInt(id) },
        updateFavouriteDto,
        { new: true }
      )
      .exec();

    if (!updatedFavourite) {
      throw new NotFoundException('Không tìm thấy yêu thích');
    }

    return updatedFavourite;
  }

  async remove(id: string): Promise<void> {
    const result = await this.favouriteModel.deleteOne({ favouriteId: parseInt(id) }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Không tìm thấy yêu thích');
    }
  }

  async removeByUserAndPost(userId: number, postType: string, postId: number): Promise<void> {
    const result = await this.favouriteModel.deleteOne({ userId, postType, postId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Không tìm thấy yêu thích');
    }
  }

  private async getNextFavouriteId(): Promise<number> {
    const lastFavourite = await this.favouriteModel.findOne().sort({ favouriteId: -1 }).exec();
    return lastFavourite ? lastFavourite.favouriteId + 1 : 1;
  }
}
