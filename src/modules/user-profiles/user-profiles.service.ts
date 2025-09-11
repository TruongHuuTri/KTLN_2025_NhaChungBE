import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserProfile, UserProfileDocument } from './schemas/user-profile.schema';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@Injectable()
export class UserProfilesService {
  constructor(
    @InjectModel(UserProfile.name)
    private userProfileModel: Model<UserProfileDocument>,
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

    // Cập nhật thông tin
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
    let totalFields = 0;

    // Basic info fields
    const basicFields = ['age', 'gender', 'occupation', 'income', 'currentLocation'];
    totalFields += basicFields.length;
    const completedBasicFields = basicFields.filter(field => profile[field] !== undefined).length;
    completion += (completedBasicFields / basicFields.length) * 30; // 30% weight

    // Preferences fields
    const preferenceFields = ['preferredDistricts', 'budgetRange', 'roomType', 'amenities', 'lifestyle'];
    totalFields += preferenceFields.length;
    const completedPreferenceFields = preferenceFields.filter(field => profile[field] !== undefined).length;
    completion += (completedPreferenceFields / preferenceFields.length) * 40; // 40% weight

    // Role-specific fields
    if (profile.businessType) {
      // Landlord fields
      const landlordFields = ['experience', 'propertiesCount', 'propertyTypes', 'targetDistricts', 'priceRange'];
      totalFields += landlordFields.length;
      const completedLandlordFields = landlordFields.filter(field => profile[field] !== undefined).length;
      completion += (completedLandlordFields / landlordFields.length) * 30; // 30% weight
    } else {
      // User fields
      const userFields = ['smoking', 'pets', 'cleanliness', 'socialLevel'];
      totalFields += userFields.length;
      const completedUserFields = userFields.filter(field => profile[field] !== undefined).length;
      completion += (completedUserFields / userFields.length) * 30; // 30% weight
    }

    // Cập nhật completion status
    profile.isBasicInfoComplete = completedBasicFields === basicFields.length;
    profile.isPreferencesComplete = completedPreferenceFields === preferenceFields.length;
    profile.isLandlordInfoComplete = profile.businessType ? 
      !!(profile.experience && profile.propertiesCount && profile.propertyTypes) : true;
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
