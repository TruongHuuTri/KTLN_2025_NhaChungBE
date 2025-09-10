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
      street: createPhongTroDto.address.street || '',
      ward: createPhongTroDto.address.ward,
      city: createPhongTroDto.address.city,
      specificAddress: createPhongTroDto.address.specificAddress || '',
      showSpecificAddress: createPhongTroDto.address.showSpecificAddress || false,
      provinceCode: createPhongTroDto.address.provinceCode,
      provinceName: createPhongTroDto.address.provinceName,
      wardCode: createPhongTroDto.address.wardCode,
      wardName: createPhongTroDto.address.wardName,
      additionalInfo: createPhongTroDto.address.additionalInfo || '',
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
      utilities: {
        electricityPricePerKwh: createPhongTroDto.utilities?.electricityPricePerKwh || 0,
        waterPrice: createPhongTroDto.utilities?.waterPrice || 0,
        waterBillingType: createPhongTroDto.utilities?.waterBillingType || '',
        internetFee: createPhongTroDto.utilities?.internetFee || 0,
        garbageFee: createPhongTroDto.utilities?.garbageFee || 0,
        cleaningFee: createPhongTroDto.utilities?.cleaningFee || 0,
        parkingMotorbikeFee: createPhongTroDto.utilities?.parkingMotorbikeFee || 0,
        cookingGasFee: createPhongTroDto.utilities?.cookingGasFee || 0,
        includedInRent: {
          electricity: createPhongTroDto.utilities?.includedInRent?.electricity || false,
          water: createPhongTroDto.utilities?.includedInRent?.water || false,
          internet: createPhongTroDto.utilities?.includedInRent?.internet || false,
          garbage: createPhongTroDto.utilities?.includedInRent?.garbage || false,
          cleaning: createPhongTroDto.utilities?.includedInRent?.cleaning || false,
          parkingMotorbike: createPhongTroDto.utilities?.includedInRent?.parkingMotorbike || false,
          parkingCar: false,
          managementFee: false,
        },
      },
    });

    return createdRentPost.save();
  }

  // Tạo bài đăng chung cư
  async createChungCu(createChungCuDto: CreateChungCuDto): Promise<RentPost> {
    const nextRentPostId = await this.getNextRentPostId();
    
    const address: Address = {
      street: createChungCuDto.address.street || '',
      ward: createChungCuDto.address.ward,
      city: createChungCuDto.address.city,
      specificAddress: createChungCuDto.address.specificAddress || '',
      showSpecificAddress: createChungCuDto.address.showSpecificAddress || false,
      provinceCode: createChungCuDto.address.provinceCode,
      provinceName: createChungCuDto.address.provinceName,
      wardCode: createChungCuDto.address.wardCode,
      wardName: createChungCuDto.address.wardName,
      additionalInfo: createChungCuDto.address.additionalInfo || '',
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
      utilities: {
        electricityPricePerKwh: createChungCuDto.utilities?.electricityPricePerKwh || 0,
        waterPrice: createChungCuDto.utilities?.waterPrice || 0,
        waterBillingType: createChungCuDto.utilities?.waterBillingType || '',
        internetFee: createChungCuDto.utilities?.internetFee || 0,
        garbageFee: createChungCuDto.utilities?.garbageFee || 0,
        cleaningFee: createChungCuDto.utilities?.cleaningFee || 0,
        parkingMotorbikeFee: createChungCuDto.utilities?.parkingMotorbikeFee || 0,
        parkingCarFee: createChungCuDto.utilities?.parkingCarFee || 0,
        managementFee: createChungCuDto.utilities?.managementFee || 0,
        managementFeeUnit: createChungCuDto.utilities?.managementFeeUnit || '',
        includedInRent: {
          electricity: createChungCuDto.utilities?.includedInRent?.electricity || false,
          water: createChungCuDto.utilities?.includedInRent?.water || false,
          internet: createChungCuDto.utilities?.includedInRent?.internet || false,
          garbage: createChungCuDto.utilities?.includedInRent?.garbage || false,
          cleaning: createChungCuDto.utilities?.includedInRent?.cleaning || false,
          parkingMotorbike: createChungCuDto.utilities?.includedInRent?.parkingMotorbike || false,
          parkingCar: createChungCuDto.utilities?.includedInRent?.parkingCar || false,
          managementFee: createChungCuDto.utilities?.includedInRent?.managementFee || false,
        },
      },
    });

    return createdRentPost.save();
  }

  // Tạo bài đăng nhà nguyên căn
  async createNhaNguyenCan(createNhaNguyenCanDto: CreateNhaNguyenCanDto): Promise<RentPost> {
    const nextRentPostId = await this.getNextRentPostId();
    
    const address: Address = {
      street: createNhaNguyenCanDto.address.street || '',
      ward: createNhaNguyenCanDto.address.ward,
      city: createNhaNguyenCanDto.address.city,
      specificAddress: createNhaNguyenCanDto.address.specificAddress || '',
      showSpecificAddress: createNhaNguyenCanDto.address.showSpecificAddress || false,
      provinceCode: createNhaNguyenCanDto.address.provinceCode,
      provinceName: createNhaNguyenCanDto.address.provinceName,
      wardCode: createNhaNguyenCanDto.address.wardCode,
      wardName: createNhaNguyenCanDto.address.wardName,
      additionalInfo: createNhaNguyenCanDto.address.additionalInfo || '',
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
      utilities: {
        electricityPricePerKwh: createNhaNguyenCanDto.utilities?.electricityPricePerKwh || 0,
        waterPrice: createNhaNguyenCanDto.utilities?.waterPrice || 0,
        waterBillingType: createNhaNguyenCanDto.utilities?.waterBillingType || '',
        internetFee: createNhaNguyenCanDto.utilities?.internetFee || 0,
        garbageFee: createNhaNguyenCanDto.utilities?.garbageFee || 0,
        cleaningFee: createNhaNguyenCanDto.utilities?.cleaningFee || 0,
        parkingMotorbikeFee: createNhaNguyenCanDto.utilities?.parkingMotorbikeFee || 0,
        parkingCarFee: createNhaNguyenCanDto.utilities?.parkingCarFee || 0,
        managementFee: createNhaNguyenCanDto.utilities?.managementFee || 0,
        managementFeeUnit: createNhaNguyenCanDto.utilities?.managementFeeUnit || '',
        gardeningFee: createNhaNguyenCanDto.utilities?.gardeningFee || 0,
        includedInRent: {
          electricity: createNhaNguyenCanDto.utilities?.includedInRent?.electricity || false,
          water: createNhaNguyenCanDto.utilities?.includedInRent?.water || false,
          internet: createNhaNguyenCanDto.utilities?.includedInRent?.internet || false,
          garbage: createNhaNguyenCanDto.utilities?.includedInRent?.garbage || false,
          cleaning: createNhaNguyenCanDto.utilities?.includedInRent?.cleaning || false,
          parkingMotorbike: createNhaNguyenCanDto.utilities?.includedInRent?.parkingMotorbike || false,
          parkingCar: createNhaNguyenCanDto.utilities?.includedInRent?.parkingCar || false,
          managementFee: createNhaNguyenCanDto.utilities?.includedInRent?.managementFee || false,
        },
      },
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
