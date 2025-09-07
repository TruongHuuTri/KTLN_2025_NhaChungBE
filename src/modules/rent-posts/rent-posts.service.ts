import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RentPost, RentPostDocument, BasicInfo, ChungCuInfo, NhaNguyenCanInfo, Address } from './schemas/rent-post.schema';
import { CreateRentPostDto } from './dto/create-rent-post.dto';
import { UpdateRentPostDto } from './dto/update-rent-post.dto';
import { CreatePhongTroDto } from './dto/phong-tro.dto';
import { CreateChungCuDto } from './dto/chung-cu.dto';
import { CreateNhaNguyenCanDto } from './dto/nha-nguyen-can.dto';

@Injectable()
export class RentPostsService {
  constructor(
    @InjectModel(RentPost.name) private rentPostModel: Model<RentPostDocument>,
  ) {}

  async create(createRentPostDto: CreateRentPostDto): Promise<RentPost> {
    const nextRentPostId = await this.getNextRentPostId();
    
    const createdRentPost = new this.rentPostModel({
      ...createRentPostDto,
      userId: parseInt(createRentPostDto.userId),
      rentPostId: nextRentPostId,
    });

    return createdRentPost.save();
  }

  // Tạo bài đăng phòng trọ
  async createPhongTro(createPhongTroDto: CreatePhongTroDto): Promise<RentPost> {
    const nextRentPostId = await this.getNextRentPostId();
    
    const address: Address = {
      street: createPhongTroDto.address.street,
      ward: createPhongTroDto.address.ward,
      district: createPhongTroDto.address.district,
      city: createPhongTroDto.address.city,
      houseNumber: createPhongTroDto.address.houseNumber || '',
      showHouseNumber: createPhongTroDto.address.showHouseNumber || false,
    };

    const basicInfo: BasicInfo = {
      area: createPhongTroDto.area,
      price: createPhongTroDto.price,
      deposit: createPhongTroDto.deposit || 0,
      furniture: createPhongTroDto.furniture || '',
      bedrooms: 0,
      bathrooms: 0,
      direction: '',
      legalStatus: '',
    };

    const createdRentPost = new this.rentPostModel({
      rentPostId: nextRentPostId,
      userId: parseInt(createPhongTroDto.userId),
      title: createPhongTroDto.title,
      description: createPhongTroDto.description,
      images: createPhongTroDto.images || [],
      videos: createPhongTroDto.videos || [],
      address,
      category: 'phong-tro',
      basicInfo,
      status: createPhongTroDto.status || 'active',
    });

    return createdRentPost.save();
  }

  // Tạo bài đăng chung cư
  async createChungCu(createChungCuDto: CreateChungCuDto): Promise<RentPost> {
    const nextRentPostId = await this.getNextRentPostId();
    
    const address: Address = {
      street: createChungCuDto.address.street,
      ward: createChungCuDto.address.ward,
      district: createChungCuDto.address.district,
      city: createChungCuDto.address.city,
      houseNumber: createChungCuDto.address.houseNumber || '',
      showHouseNumber: createChungCuDto.address.showHouseNumber || false,
    };

    const basicInfo: BasicInfo = {
      area: createChungCuDto.area,
      price: createChungCuDto.price,
      deposit: createChungCuDto.deposit || 0,
      furniture: createChungCuDto.furniture || '',
      bedrooms: createChungCuDto.bedrooms || 0,
      bathrooms: createChungCuDto.bathrooms || 0,
      direction: createChungCuDto.direction || '',
      legalStatus: createChungCuDto.legalStatus || '',
    };

    const chungCuInfo: ChungCuInfo = {
      buildingName: createChungCuDto.buildingInfo?.buildingName || '',
      blockOrTower: createChungCuDto.buildingInfo?.blockOrTower || '',
      floorNumber: createChungCuDto.buildingInfo?.floorNumber || 0,
      unitCode: createChungCuDto.buildingInfo?.unitCode || '',
      propertyType: createChungCuDto.propertyType || '',
    };

    const createdRentPost = new this.rentPostModel({
      rentPostId: nextRentPostId,
      userId: parseInt(createChungCuDto.userId),
      title: createChungCuDto.title,
      description: createChungCuDto.description,
      images: createChungCuDto.images || [],
      videos: createChungCuDto.videos || [],
      address,
      category: 'chung-cu',
      basicInfo,
      chungCuInfo,
      status: createChungCuDto.status || 'active',
    });

    return createdRentPost.save();
  }

  // Tạo bài đăng nhà nguyên căn
  async createNhaNguyenCan(createNhaNguyenCanDto: CreateNhaNguyenCanDto): Promise<RentPost> {
    const nextRentPostId = await this.getNextRentPostId();
    
    const address: Address = {
      street: createNhaNguyenCanDto.address.street,
      ward: createNhaNguyenCanDto.address.ward,
      district: createNhaNguyenCanDto.address.district,
      city: createNhaNguyenCanDto.address.city,
      houseNumber: createNhaNguyenCanDto.address.houseNumber || '',
      showHouseNumber: createNhaNguyenCanDto.address.showHouseNumber || false,
    };

    const basicInfo: BasicInfo = {
      area: createNhaNguyenCanDto.landArea, // Sử dụng diện tích đất làm diện tích chính
      price: createNhaNguyenCanDto.price,
      deposit: createNhaNguyenCanDto.deposit || 0,
      furniture: createNhaNguyenCanDto.furniture || '',
      bedrooms: createNhaNguyenCanDto.bedrooms || 0,
      bathrooms: createNhaNguyenCanDto.bathrooms || 0,
      direction: createNhaNguyenCanDto.direction || '',
      legalStatus: createNhaNguyenCanDto.legalStatus || '',
    };

    const nhaNguyenCanInfo: NhaNguyenCanInfo = {
      khuLo: createNhaNguyenCanDto.propertyInfo?.khuLo || '',
      unitCode: createNhaNguyenCanDto.propertyInfo?.unitCode || '',
      propertyType: createNhaNguyenCanDto.propertyInfo?.propertyType || '',
      totalFloors: createNhaNguyenCanDto.propertyInfo?.totalFloors || 0,
      landArea: createNhaNguyenCanDto.landArea,
      usableArea: createNhaNguyenCanDto.usableArea || 0,
      width: createNhaNguyenCanDto.width || 0,
      length: createNhaNguyenCanDto.length || 0,
      features: createNhaNguyenCanDto.propertyInfo?.features || [],
    };

    const createdRentPost = new this.rentPostModel({
      rentPostId: nextRentPostId,
      userId: parseInt(createNhaNguyenCanDto.userId),
      title: createNhaNguyenCanDto.title,
      description: createNhaNguyenCanDto.description,
      images: createNhaNguyenCanDto.images || [],
      videos: createNhaNguyenCanDto.videos || [],
      address,
      category: 'nha-nguyen-can',
      basicInfo,
      nhaNguyenCanInfo,
      status: createNhaNguyenCanDto.status || 'active',
    });

    return createdRentPost.save();
  }

  async findAll(): Promise<RentPost[]> {
    return this.rentPostModel.find().exec();
  }

  async findOne(id: string): Promise<RentPost> {
    const rentPost = await this.rentPostModel.findOne({ rentPostId: parseInt(id) }).exec();
    if (!rentPost) {
      throw new NotFoundException('Không tìm thấy bài đăng thuê phòng');
    }
    return rentPost;
  }

  async findByUserId(userId: number): Promise<RentPost[]> {
    return this.rentPostModel.find({ userId }).exec();
  }

  async findByCategory(category: string): Promise<RentPost[]> {
    return this.rentPostModel.find({ category }).exec();
  }

  async findByUserIdAndCategory(userId: number, category: string): Promise<RentPost[]> {
    return this.rentPostModel.find({ userId, category }).exec();
  }

  async update(id: string, updateRentPostDto: UpdateRentPostDto): Promise<RentPost> {
    const updatedRentPost = await this.rentPostModel
      .findOneAndUpdate(
        { rentPostId: parseInt(id) },
        updateRentPostDto,
        { new: true }
      )
      .exec();

    if (!updatedRentPost) {
      throw new NotFoundException('Không tìm thấy bài đăng thuê phòng');
    }

    return updatedRentPost;
  }

  async remove(id: string): Promise<void> {
    const result = await this.rentPostModel.deleteOne({ rentPostId: parseInt(id) }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Không tìm thấy bài đăng thuê phòng');
    }
  }

  private async getNextRentPostId(): Promise<number> {
    const lastRentPost = await this.rentPostModel.findOne().sort({ rentPostId: -1 }).exec();
    return lastRentPost ? lastRentPost.rentPostId + 1 : 1;
  }
}
