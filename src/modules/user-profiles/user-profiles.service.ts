import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserProfile, UserProfileDocument } from './schemas/user-profile.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@Injectable()
export class UserProfilesService {
  constructor(
    @InjectModel(UserProfile.name)
    private userProfileModel: Model<UserProfileDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}


  /**
   * Tạo profile mới cho user
   */
  async create(createUserProfileDto: CreateUserProfileDto): Promise<UserProfile> {
    // Kiểm tra user đã có profile chưa
    const existingProfile = await this.userProfileModel.findOne({ 
      userId: createUserProfileDto.userId 
    });
    
    if (existingProfile) {
      throw new ConflictException('User đã có profile');
    }

    // Tạo profileId
    const profileId = await this.generateProfileId();

    // Tạo profile mới
    const userProfile = new this.userProfileModel({
      ...createUserProfileDto,
      profileId,
      isBasicInfoComplete: false,
      isPreferencesComplete: false,
      completionPercentage: 0,
    });

    const savedProfile = await userProfile.save();
    
    // Cập nhật completion percentage
    await this.updateCompletionPercentage((savedProfile._id as any).toString());

    // Normalize response để đảm bảo các field array luôn là mảng
    return this.normalizeProfileResponse(savedProfile);
  }

  /**
   * Lấy profile theo userId
   * Đảm bảo trả về đầy đủ thông tin, các field array luôn là mảng (không null/undefined)
   */
  async findByUserId(userId: number): Promise<UserProfile> {
    const profile = await this.userProfileModel.findOne({ userId });
    if (!profile) {
      throw new NotFoundException('Profile không tồn tại');
    }
    
    // Normalize profile để đảm bảo các field array luôn là mảng
    return this.normalizeProfileResponse(profile);
  }

  /**
   * Normalize profile response để đảm bảo các field array luôn là mảng
   * Đảm bảo preferredWards, roomType, contactMethod luôn là array (có thể rỗng)
   */
  private normalizeProfileResponse(profile: UserProfileDocument): UserProfile {
    const normalized = profile.toObject ? profile.toObject() : { ...profile };
    
    // Danh sách các field array cần normalize
    const arrayFields: Array<keyof Pick<UserProfile, 'preferredWards' | 'roomType' | 'contactMethod'>> = [
      'preferredWards',
      'roomType',
      'contactMethod',
    ];
    
    // Đảm bảo tất cả field array luôn là mảng
    arrayFields.forEach(field => {
      if (!Array.isArray(normalized[field])) {
        (normalized as any)[field] = [];
      }
    });
    
    return normalized as UserProfile;
  }

  /**
   * Lấy profile theo profileId
   */
  async findByProfileId(profileId: number): Promise<UserProfile | null> {
    const profile = await this.userProfileModel.findOne({ profileId });
    if (!profile) {
      return null;
    }
    return this.normalizeProfileResponse(profile);
  }

  /**
   * Cập nhật profile
   */
  async update(userId: number, updateUserProfileDto: UpdateUserProfileDto): Promise<UserProfile> {
    const profile = await this.userProfileModel.findOne({ userId });
    if (!profile) {
      throw new NotFoundException('Profile không tồn tại');
    }

    // Kiểm tra nếu preferredCity thay đổi
    // Nếu thành phố thay đổi, cần clear preferredWards cũ vì các phường cũ không còn hợp lệ với thành phố mới
    // Đặc biệt: Có thể có phường/xã trùng tên ở các thành phố khác nhau (ví dụ: "Bình Minh" ở cả Vĩnh Long và Hà Nội)
    const cityChanged = updateUserProfileDto.preferredCity !== undefined && 
                     updateUserProfileDto.preferredCity !== profile.preferredCity;
    
    // Lưu preferredWards từ request để xử lý sau
    const requestedWards = updateUserProfileDto.preferredWards;
    
    if (cityChanged) {
      // Khi thành phố thay đổi, LUÔN clear preferredWards cũ
      // IGNORE preferredWards trong request (nếu có) để tránh lưu phường cũ từ thành phố cũ
      // Frontend phải gửi preferredWards trong request riêng sau khi đã set preferredCity
      profile.preferredWards = [];
      
      // Tạo object mới không có preferredWards để Object.assign không ghi đè
      const { preferredWards, ...updateDtoWithoutWards } = updateUserProfileDto;
      Object.assign(profile, updateDtoWithoutWards);
    } else {
      // Nếu thành phố KHÔNG thay đổi, update bình thường (bao gồm cả preferredWards nếu có)
      Object.assign(profile, updateUserProfileDto);
    }
    
    // Đảm bảo preferredWards luôn là mảng sau khi update
    if (!Array.isArray(profile.preferredWards)) {
      profile.preferredWards = [];
    }
    
    const updatedProfile = await profile.save();

    // Cập nhật completion percentage
    await this.updateCompletionPercentage((updatedProfile._id as any).toString());

    // Normalize response để đảm bảo các field array luôn là mảng
    return this.normalizeProfileResponse(updatedProfile);
  }

  /**
   * Xóa profile
   */
  async remove(userId: number): Promise<void> {
    const result = await this.userProfileModel.deleteOne({ userId });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Profile không tồn tại');
    }
  }

  /**
   * Lấy tất cả profiles (admin)
   */
  async findAll(): Promise<UserProfile[]> {
    const profiles = await this.userProfileModel.find().exec();
    // Normalize tất cả profiles để đảm bảo các field array luôn là mảng
    return profiles.map(profile => this.normalizeProfileResponse(profile));
  }

  /**
   * Tạo profileId mới
   */
  private async generateProfileId(): Promise<number> {
    const lastProfile = await this.userProfileModel
      .findOne({}, {}, { sort: { profileId: -1 } });
    return lastProfile ? lastProfile.profileId + 1 : 1;
  }

  /**
   * Cập nhật completion percentage
   */
  private async updateCompletionPercentage(profileId: string): Promise<void> {
    const profile = await this.userProfileModel.findById(profileId);
    if (!profile) return;

    let completion = 0;

    // Basic info fields (50%)
    const basicFields = ['occupation', 'pets'];
    const completedBasicFields = basicFields.filter(field => profile[field] !== undefined).length;
    completion += (completedBasicFields / basicFields.length) * 50;

    // Preferences fields (50%) - preferredCity + preferredWards + roomType
    const preferenceFields = ['preferredCity', 'preferredWards', 'roomType'];
    const completedPreferenceFields = preferenceFields.filter(field => profile[field] !== undefined).length;
    completion += (completedPreferenceFields / preferenceFields.length) * 50;

    // Cập nhật completion status
    profile.isBasicInfoComplete = completedBasicFields === basicFields.length;
    profile.isPreferencesComplete = completedPreferenceFields === preferenceFields.length;
    profile.completionPercentage = Math.round(completion);

    await profile.save();
  }

  /**
   * Lấy profiles theo completion percentage
   */
  async findByCompletion(minPercentage: number): Promise<UserProfile[]> {
    const profiles = await this.userProfileModel.find({ 
      completionPercentage: { $gte: minPercentage } 
    }).exec();
    // Normalize tất cả profiles để đảm bảo các field array luôn là mảng
    return profiles.map(profile => this.normalizeProfileResponse(profile));
  }

  /**
   * Lấy profiles theo role
   * LƯU Ý: Chỉ còn user profile, không còn landlord profile
   */
  async findByRole(role: string): Promise<UserProfile[]> {
    // Tất cả profiles đều là user profiles
    const profiles = await this.userProfileModel.find().exec();
    // Normalize tất cả profiles để đảm bảo các field array luôn là mảng
    return profiles.map(profile => this.normalizeProfileResponse(profile));
  }
}
