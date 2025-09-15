import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserProfile, UserProfileDocument } from './schemas/user-profile.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { AgeUtils } from '../../shared/utils/age.utils';

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

    // Validate dateOfBirth nếu có
    if (createUserProfileDto.dateOfBirth) {
      if (!AgeUtils.validateAge(createUserProfileDto.dateOfBirth)) {
        throw new BadRequestException('Tuổi phải từ 18-100');
      }
    }

    // Tạo profileId
    const profileId = await this.generateProfileId();

    // Tạo profile mới
    const userProfile = new this.userProfileModel({
      ...createUserProfileDto,
      profileId,
      isBasicInfoComplete: false,
      isPreferencesComplete: false,
      isLandlordInfoComplete: false,
      completionPercentage: 0,
    });

    const savedProfile = await userProfile.save();
    
    // Cập nhật completion percentage
    await this.updateCompletionPercentage((savedProfile._id as any).toString());

    return savedProfile;
  }

  /**
   * Lấy profile theo userId
   */
  async findByUserId(userId: number): Promise<UserProfile> {
    const profile = await this.userProfileModel.findOne({ userId });
    if (!profile) {
      throw new NotFoundException('Profile không tồn tại');
    }
    return profile;
  }

  /**
   * Cập nhật profile
   */
  async update(userId: number, updateUserProfileDto: UpdateUserProfileDto): Promise<UserProfile> {
    const profile = await this.userProfileModel.findOne({ userId });
    if (!profile) {
      throw new NotFoundException('Profile không tồn tại');
    }

    // Validate dateOfBirth nếu có
    if (updateUserProfileDto.dateOfBirth) {
      if (!AgeUtils.validateAge(updateUserProfileDto.dateOfBirth)) {
        throw new BadRequestException('Tuổi phải từ 18-100');
      }
    }

    // Cập nhật thông tin (giữ nguyên dữ liệu FE gửi)
    Object.assign(profile, updateUserProfileDto);
    const updatedProfile = await profile.save();

    // Cập nhật completion percentage
    await this.updateCompletionPercentage((updatedProfile._id as any).toString());

    return updatedProfile;
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
    return this.userProfileModel.find().exec();
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
    // Dùng lại ở nhiều nơi: xác định đã có khu vực mục tiêu (landlord)
    const hasTargetArea = !!(profile['targetWards'] && (profile['targetWards'] as any[]).length)
      || !!(profile['targetDistricts'] && (profile['targetDistricts'] as any[]).length)
      || !!(profile['targetWardCodes'] && (profile['targetWardCodes'] as any[]).length)
      || !!profile['targetCityCode'] || !!profile['targetCityName'];

    // Basic info fields (30%)
    const basicFields = ['dateOfBirth', 'gender', 'occupation', 'income', 'currentLocation'];
    const completedBasicFields = basicFields.filter(field => profile[field] !== undefined).length;
    completion += (completedBasicFields / basicFields.length) * 30;

    // Preferences fields (40%) - user: preferredCity + preferredWards
    const preferenceCoreFields = ['budgetRange', 'roomType', 'amenities', 'lifestyle'];
    const completedCorePref = preferenceCoreFields.filter(field => profile[field] !== undefined).length;
    const hasPreferredArea = !!profile['preferredCity'] && !!(profile['preferredWards'] && (profile['preferredWards'] as any[]).length);
    const completedPreferenceFields = completedCorePref + (hasPreferredArea ? 1 : 0);
    const totalPreferenceFields = preferenceCoreFields.length + 1; // +1 nhóm preferred area
    completion += (completedPreferenceFields / totalPreferenceFields) * 40;

    // Role-specific fields
    if (profile.businessType) {
      // Landlord fields (30%) - yêu cầu targetCity + targetWards
      const landlordFields = ['experience', 'propertyTypes', 'priceRange'];
      const baseCompleted = landlordFields.filter(field => profile[field] !== undefined).length;
      const landlordHasTarget = !!profile['targetCity'] && !!(profile['targetWards'] && (profile['targetWards'] as any[]).length);
      const completedLandlordFields = baseCompleted + (landlordHasTarget ? 1 : 0);
      const totalLandlordFields = landlordFields.length + 1; // +1 nhóm target
      completion += (completedLandlordFields / totalLandlordFields) * 30;
    } else {
      // User fields (30%)
      const userFields = ['smoking', 'pets', 'cleanliness', 'socialLevel'];
      const completedUserFields = userFields.filter(field => profile[field] !== undefined).length;
      completion += (completedUserFields / userFields.length) * 30;
    }

    // Cập nhật completion status
    profile.isBasicInfoComplete = completedBasicFields === basicFields.length;
    profile.isPreferencesComplete = completedPreferenceFields === totalPreferenceFields;
    profile.isLandlordInfoComplete = profile.businessType ? 
      !!(profile.experience && profile.propertyTypes && profile.priceRange && profile['targetCity'] && profile['targetWards'] && (profile['targetWards'] as any[]).length) : true;
    profile.completionPercentage = Math.round(completion);

    await profile.save();
  }

  /**
   * Lấy profiles theo completion percentage
   */
  async findByCompletion(minPercentage: number): Promise<UserProfile[]> {
    return this.userProfileModel.find({ 
      completionPercentage: { $gte: minPercentage } 
    }).exec();
  }

  /**
   * Lấy profiles theo role
   */
  async findByRole(role: string): Promise<UserProfile[]> {
    const query = role === 'landlord' ? 
      { businessType: { $exists: true } } : 
      { businessType: { $exists: false } };
    
    return this.userProfileModel.find(query).exec();
  }
}
