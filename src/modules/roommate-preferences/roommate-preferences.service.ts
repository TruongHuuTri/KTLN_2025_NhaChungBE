import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoommatePreference, RoommatePreferenceDocument } from './schemas/roommate-preference.schema';
import { SeekerPreference, SeekerPreferenceDocument } from './schemas/seeker-preference.schema';
import { CreateRoommatePreferenceDto } from './dto/create-roommate-preference.dto';
import { UpdateRoommatePreferenceDto } from './dto/update-roommate-preference.dto';
import { FindRoommateDto } from './dto/find-roommate.dto';
import { Post, PostDocument } from '../posts/schemas/post.schema';
import { Room, RoomDocument } from '../rooms/schemas/room.schema';
import { Building, BuildingDocument } from '../rooms/schemas/building.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { UserProfile, UserProfileDocument } from '../user-profiles/schemas/user-profile.schema';
import { RentalContract, RentalContractDocument } from '../contracts/schemas/rental-contract.schema';
import { Verification, VerificationDocument } from '../verifications/schemas/verification.schema';
import { PostsService } from '../posts/posts.service';
import { AgeUtils } from '../../shared/utils/age.utils';

@Injectable()
export class RoommatePreferencesService {
  constructor(
    @InjectModel(RoommatePreference.name)
    private preferenceModel: Model<RoommatePreferenceDocument>,
    @InjectModel(SeekerPreference.name)
    private seekerPreferenceModel: Model<SeekerPreferenceDocument>,
    @InjectModel(Post.name)
    private postModel: Model<PostDocument>,
    @InjectModel(Room.name)
    private roomModel: Model<RoomDocument>,
    @InjectModel(Building.name)
    private buildingModel: Model<BuildingDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(UserProfile.name)
    private userProfileModel: Model<UserProfileDocument>,
    @InjectModel(RentalContract.name)
    private contractModel: Model<RentalContractDocument>,
    @InjectModel(Verification.name)
    private verificationModel: Model<VerificationDocument>,
    @Inject(forwardRef(() => PostsService))
    private postsService: PostsService,
  ) {}

  /**
   * Lấy preference của phòng
   */
  async getRoommatePreference(userId: number, roomId: number): Promise<any> {
    const preference = await this.preferenceModel.findOne({ userId, roomId }).exec();
    
    if (!preference) {
      return {
        enabled: false,
        postId: null,
        postStatus: null,
        requirements: null,
      };
    }

    let postStatus: string | null = null;
    if (preference.postId) {
      const postId = Number(preference.postId);
      if (!isNaN(postId) && postId > 0) {
        const post = await this.postModel.findOne({ postId }).exec();
        postStatus = post ? post.status : null;
      }
    }

    return {
      enabled: preference.enabled,
      postId: preference.postId || null,
      postStatus,
      requirements: preference.requirements || null,
    };
  }

  /**
   * Tạo/cập nhật preference
   */
  async createOrUpdateRoommatePreference(
    userId: number,
    roomId: number,
    preferenceData: CreateRoommatePreferenceDto | UpdateRoommatePreferenceDto,
  ): Promise<{ preference: RoommatePreference; post?: any }> {
    // Kiểm tra phòng có tồn tại không
    const room = await this.roomModel.findOne({ roomId }).exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Kiểm tra user có contract active với phòng này không
    const contract = await this.contractModel.findOne({
      roomId,
      'tenants.tenantId': userId,
      status: 'active',
    }).exec();

    if (!contract) {
      throw new BadRequestException('Bạn phải có hợp đồng active với phòng này để tìm ở ghép');
    }

    // Tìm preference hiện tại
    let preference = await this.preferenceModel.findOne({ userId, roomId }).exec();

    if (preference) {
      // Cập nhật preference
      preference.enabled = preferenceData.enabled;
      if (preferenceData.requirements) {
        preference.requirements = preferenceData.requirements as any;
      }
      if ((preferenceData as any).posterTraits !== undefined) {
        preference.posterTraits = (preferenceData as any).posterTraits;
      }
      preference.updatedAt = new Date();
    } else {
      // Tạo preference mới
      const preferenceId = await this.getNextPreferenceId();
      preference = new this.preferenceModel({
        preferenceId,
        userId,
        roomId,
        enabled: preferenceData.enabled,
        requirements: preferenceData.requirements as any,
        posterTraits: (preferenceData as any).posterTraits || [],
      });
    }

    // Nếu enabled = true, tự động tạo bài đăng
    if (preference.enabled && preferenceData.requirements) {
      const post = await this.autoCreatePost(userId, roomId, preferenceData.requirements);
      preference.postId = post.postId;
      await preference.save();
      return { preference, post };
    } else if (preference.enabled && preference.postId) {
      // Nếu đã có bài đăng, chỉ cập nhật requirements nếu có
      const postId = Number(preference.postId);
      if (!isNaN(postId) && postId > 0) {
        if (preferenceData.requirements) {
          await this.updatePostRequirements(postId, preferenceData.requirements);
        }
        await preference.save();
        const post = await this.postModel.findOne({ postId }).exec();
        return { preference, post };
      }
    } else if (!preference.enabled && preference.postId) {
      // Nếu disabled, ẩn bài đăng
      const postId = Number(preference.postId);
      if (!isNaN(postId) && postId > 0) {
        await this.hidePost(postId);
      }
      await preference.save();
      return { preference };
    }

    await preference.save();
    return { preference };
  }

  /**
   * Tự động tạo bài đăng
   */
  private async autoCreatePost(
    userId: number,
    roomId: number,
    requirements: any,
  ): Promise<Post> {
    // Lấy thông tin phòng
    const room = await this.roomModel.findOne({ roomId }).exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Lấy thông tin user và profile
    const user = await this.userModel.findOne({ userId }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userProfile = await this.userProfileModel.findOne({ userId }).exec();
    
    // Lấy thông tin từ profile hoặc user
    const personalInfo = await this.getPersonalInfoFromProfile(userId, userProfile);

    // Tạo title tự động
    const building = await this.getBuildingInfo(room.buildingId);
    const title = `Tìm người ở ghép phòng ${room.roomNumber}${building ? ` - ${building.name}` : ''}`;

    // Tạo bài đăng
    const postData = {
      postType: 'tim-o-ghep',
      title,
      description: room.description || '',
      images: room.images || [],
      videos: room.videos || [],
      roomId,
      buildingId: room.buildingId,
      landlordId: room.landlordId,
      personalInfo,
      requirements: {
        ageRange: requirements.ageRange,
        gender: requirements.gender,
        traits: requirements.traits || [],
        maxPrice: requirements.maxPrice,
      },
      isManaged: true,
      source: 'roommate_preference',
      status: 'pending', // Chờ admin duyệt
    };

    return this.postsService.createPost(userId, postData as any);
  }

  /**
   * Lấy personal info từ profile
   */
  private async getPersonalInfoFromProfile(userId: number, userProfile: any): Promise<any> {
    // Lấy từ user
    const user = await this.userModel.findOne({ userId }).exec();
    const fullName = user?.name || 'Người dùng';

    // Lấy từ verification nếu có (có dateOfBirth, gender)
    let dateOfBirth = new Date(1990, 0, 1);
    let gender = 'other';
    
    try {
      const verification = await this.verificationModel.findOne({ userId, status: 'approved' }).exec();
      
      if (verification && verification.dateOfBirth) {
        dateOfBirth = new Date(verification.dateOfBirth);
        gender = verification.gender || 'other';
      }
    } catch (error) {
      // Verification không available, sử dụng mặc định
    }

    // Lấy occupation từ profile nếu có
    const occupation = userProfile?.occupation || '';

    // Tạo mặc định cho các trường còn lại
    return {
      fullName,
      dateOfBirth,
      gender,
      occupation,
      lifestyle: 'normal',
      cleanliness: 'normal',
    };
  }

  /**
   * Lấy thông tin building
   */
  private async getBuildingInfo(buildingId: number): Promise<Building | null> {
    try {
      return await this.buildingModel.findOne({ buildingId }).exec();
    } catch (error) {
      return null;
    }
  }

  /**
   * Cập nhật requirements của bài đăng
   */
  private async updatePostRequirements(postId: number, requirements: any): Promise<void> {
    await this.postModel.findOneAndUpdate(
      { postId },
      {
        'requirements.ageRange': requirements.ageRange,
        'requirements.gender': requirements.gender,
        'requirements.traits': requirements.traits || [],
        'requirements.maxPrice': requirements.maxPrice,
        updatedAt: new Date(),
      },
    ).exec();
  }

  /**
   * Ẩn bài đăng
   */
  private async hidePost(postId: number): Promise<void> {
    await this.postModel.findOneAndUpdate(
      { postId },
      { status: 'inactive', updatedAt: new Date() },
    ).exec();
  }

  /**
   * Lấy preferences của Seeker
   */
  async getSeekerPreference(seekerId: number): Promise<any> {
    const seekerPreference = await this.seekerPreferenceModel.findOne({ userId: seekerId }).exec();
    
    if (!seekerPreference) {
      return {
        hasPreferences: false,
        requirements: null,
        seekerTraits: null,
      };
    }

    return {
      hasPreferences: true,
      requirements: seekerPreference.requirements || null,
      seekerTraits: seekerPreference.seekerTraits || [],
      updatedAt: seekerPreference.updatedAt,
    };
  }

  /**
   * Tự động match với preferences đã lưu (không cần form)
   */
  async findRoommateAuto(seekerId: number): Promise<any> {
    // Lấy preferences đã lưu
    const seekerPreference = await this.seekerPreferenceModel.findOne({ userId: seekerId }).exec();
    
    if (!seekerPreference || !seekerPreference.requirements) {
      return {
        matches: [],
        totalMatches: 0,
        message: 'Bạn chưa có preferences. Vui lòng điền form tìm phòng.',
      };
    }

    // Lấy personalInfo từ user/profile để matching
    const userProfile = await this.userProfileModel.findOne({ userId: seekerId }).exec();
    const personalInfo = await this.getPersonalInfoFromProfile(seekerId, userProfile);
    
    // Lấy age từ verification hoặc personalInfo
    let age = personalInfo.dateOfBirth ? AgeUtils.calculateAge(personalInfo.dateOfBirth) : 25;
    try {
      const verification = await this.verificationModel.findOne({ userId: seekerId, status: 'approved' }).exec();
      if (verification && verification.dateOfBirth) {
        age = AgeUtils.calculateAge(verification.dateOfBirth);
      }
    } catch (error) {
      // Verification không available
    }

    // Tạo FindRoommateDto từ preferences đã lưu + personalInfo
    const findRoommateDto: FindRoommateDto = {
      ageRange: seekerPreference.requirements.ageRange as [number, number],
      gender: seekerPreference.requirements.gender as 'male' | 'female' | 'any',
      traits: seekerPreference.seekerTraits || seekerPreference.requirements.traits || [],
      maxPrice: seekerPreference.requirements.maxPrice,
      personalInfo: {
        fullName: personalInfo.fullName,
        age: age,
        gender: personalInfo.gender,
        occupation: personalInfo.occupation,
        lifestyle: personalInfo.lifestyle,
        cleanliness: personalInfo.cleanliness,
      },
    };

    // Match với preferences đã lưu
    return this.findRoommate(seekerId, findRoommateDto);
  }

  /**
   * Lưu preferences của Seeker (tự động lưu/update mỗi khi tìm phòng)
   */
  private async saveSeekerPreferences(seekerId: number, findRoommateDto: FindRoommateDto): Promise<void> {
    try {
      let seekerPreference = await this.seekerPreferenceModel.findOne({ userId: seekerId }).exec();

      const requirements = {
        ageRange: findRoommateDto.ageRange,
        gender: findRoommateDto.gender,
        traits: findRoommateDto.traits || [],
        maxPrice: findRoommateDto.maxPrice,
      };

      const seekerTraits = findRoommateDto.traits || [];

      if (seekerPreference) {
        // Cập nhật preferences
        seekerPreference.requirements = requirements as any;
        seekerPreference.seekerTraits = seekerTraits;
        seekerPreference.updatedAt = new Date();
        await seekerPreference.save();
      } else {
        // Tạo preferences mới
        const seekerPreferenceId = await this.getNextSeekerPreferenceId();
        seekerPreference = new this.seekerPreferenceModel({
          seekerPreferenceId,
          userId: seekerId,
          requirements: requirements as any,
          seekerTraits,
        });
        await seekerPreference.save();
      }
    } catch (error) {
      console.error(`[ERROR] Error saving seeker preferences for user ${seekerId}:`, error);
      // Không throw error để không ảnh hưởng đến flow tìm phòng
    }
  }

  /**
   * Tìm phòng ở ghép (matching)
   */
  async findRoommate(seekerId: number, findRoommateDto: FindRoommateDto): Promise<any> {
    // Lưu preferences của Seeker (tự động lưu/update mỗi khi tìm phòng)
    await this.saveSeekerPreferences(seekerId, findRoommateDto);
    
    // Lấy thông tin người tìm phòng (truyền seekerRequirements để lấy traits)
    const seekerProfile = await this.getSeekerProfile(seekerId, findRoommateDto.personalInfo, findRoommateDto);
    
    // ✅ Query từ roommatePreferences thay vì posts (ưu tiên)
    // Đảm bảo không bỏ sót, không phụ thuộc vào post status
    const preferences = await this.preferenceModel.find({
      enabled: true,
      userId: { $ne: seekerId }, // Loại bỏ bài đăng của chính user
    }).exec();

    const matches: any[] = [];

    for (const preference of preferences) {
      try {
        // Kiểm tra contract status
        const contract = await this.contractModel.findOne({
          roomId: preference.roomId,
          'tenants.tenantId': preference.userId,
          status: 'active',
        }).exec();

        if (!contract) {
          continue;
        }

        // Lấy thông tin phòng và user
        const room = await this.roomModel.findOne({ roomId: preference.roomId }).exec();
        const user = await this.userModel.findOne({ userId: preference.userId }).exec();
        
        if (!room || !user) {
          continue;
        }

        // Lấy personalInfo từ user/profile
        const userProfile = await this.userProfileModel.findOne({ userId: preference.userId }).exec();
        const personalInfo = await this.getPersonalInfoFromProfile(preference.userId, userProfile);
        
        // Tạo post object để sử dụng checkMatching
        const post = {
          postId: preference.postId || 0,
          userId: preference.userId,
          roomId: preference.roomId,
          requirements: preference.requirements,
          personalInfo: personalInfo,
          posterTraits: preference.posterTraits || [], // Lấy traits của Poster từ preference
        };

        // Kiểm tra matching
        const matchResult = await this.checkMatching(
          post as any,
          seekerProfile,
          findRoommateDto,
        );

        if (matchResult.isMatch) {
          const building = await this.getBuildingInfo(room.buildingId);
          
          matches.push({
            postId: preference.postId || 0,
            roomId: preference.roomId,
            posterId: preference.userId,
            posterName: user.name,
            posterAge: this.getAgeFromPersonalInfo(personalInfo),
            posterGender: personalInfo.gender || 'other',
            posterOccupation: personalInfo.occupation || '',
            roomNumber: room.roomNumber,
            buildingName: building?.name || '',
            address: this.getRoomAddress(room),
            price: room.price,
            area: room.area,
            traits: preference.posterTraits || [],
            matchScore: matchResult.matchScore,
            images: room.images || [],
          });
        }
      } catch (error) {
        console.error(`[ERROR] Error matching preference ${preference.preferenceId}:`, error);
        continue;
      }
    }

    // Sắp xếp theo điểm matching
    matches.sort((a, b) => b.matchScore - a.matchScore);

    return {
      matches,
      totalMatches: matches.length,
    };
  }

  /**
   * Normalize trait (case-insensitive, trim)
   */
  private normalizeTrait(trait: string): string {
    return trait.toLowerCase().trim();
  }

  /**
   * Normalize traits array
   */
  private normalizeTraits(traits: string[]): string[] {
    return traits.map(trait => this.normalizeTrait(trait));
  }

  /**
   * Kiểm tra matching
   */
  private async checkMatching(
    post: Post,
    seekerProfile: any,
    seekerRequirements: FindRoommateDto,
  ): Promise<{ isMatch: boolean; matchScore: number; condition1: boolean; condition2: boolean }> {
    let matchScore = 0;
    let isMatch = true;
    let condition1 = false;
    let condition2 = false;

    // Lấy thông tin phòng
    const room = await this.roomModel.findOne({ roomId: post.roomId }).exec();
    if (!room) {
      return { isMatch: false, matchScore: 0, condition1: false, condition2: false };
    }

    const postRequirements = post.requirements;
    if (!postRequirements) {
      return { isMatch: false, matchScore: 0, condition1: false, condition2: false };
    }

    const posterAge = this.getAgeFromPersonalInfo(post.personalInfo);
    const seekerAge = seekerProfile.age;

    // Normalize traits (case-insensitive)
    const postTraits = this.normalizeTraits(postRequirements.traits || []);
    const seekerTraits = this.normalizeTraits(seekerProfile.traits || []);
    const seekerRequiredTraits = this.normalizeTraits(seekerRequirements.traits || []);
    // Poster traits: lấy từ preference.posterTraits (đã lưu trong roommatePreferences)
    const postPersonalTraits = this.normalizeTraits((post as any).posterTraits || []);

    // 1. Kiểm tra người thuê B đáp ứng yêu cầu của bài đăng A
    let condition1Score = 0;

    // Độ tuổi: Seeker age trong range của Post
    if (seekerAge >= postRequirements.ageRange[0] && seekerAge <= postRequirements.ageRange[1]) {
      condition1Score += 30;
    } else {
      return { isMatch: false, matchScore: 0, condition1: false, condition2: false };
    }

    // Giới tính: Seeker gender khớp với Post requirement
    if (postRequirements.gender === 'any' || postRequirements.gender === seekerProfile.gender) {
      condition1Score += 20;
    } else {
      return { isMatch: false, matchScore: 0, condition1: false, condition2: false };
    }

    // Traits: Seeker có ít nhất 1 trait trong Post requirements
    if (postTraits.length === 0) {
      // Post không yêu cầu traits → Bỏ qua
    } else if (seekerTraits.length === 0) {
      // Post yêu cầu traits nhưng Seeker không có → FAIL
      return { isMatch: false, matchScore: 0, condition1: false, condition2: false };
    } else {
      // Cả hai đều có traits → Kiểm tra matching
      const commonTraits = postTraits.filter(trait => seekerTraits.includes(trait));
      if (commonTraits.length > 0) {
        condition1Score += (commonTraits.length / Math.max(postTraits.length, 1)) * 30;
      } else {
        return { isMatch: false, matchScore: 0, condition1: false, condition2: false };
      }
    }

    // Giá thuê: Seeker maxPrice >= Post maxPrice (từ preference.requirements.maxPrice)
    if (seekerRequirements.maxPrice >= postRequirements.maxPrice) {
      condition1Score += 20;
    } else {
      return { isMatch: false, matchScore: 0, condition1: false, condition2: false };
    }

    matchScore = condition1Score;
    condition1 = true;

    // 2. Kiểm tra bài đăng A (phòng + người thuê A) đáp ứng yêu cầu của người thuê B
    let condition2Score = 0;

    // Độ tuổi: Poster age trong range của Seeker
    if (posterAge >= seekerRequirements.ageRange[0] && posterAge <= seekerRequirements.ageRange[1]) {
      condition2Score += 30;
    } else {
      return { isMatch: false, matchScore: 0, condition1, condition2: false };
    }

    // Giới tính: Poster gender khớp với Seeker requirement
    if (seekerRequirements.gender === 'any' || post.personalInfo?.gender === seekerRequirements.gender) {
      condition2Score += 20;
    } else {
      return { isMatch: false, matchScore: 0, condition1, condition2: false };
    }

    // Traits: Poster có ít nhất 1 trait trong Seeker requirements
    // Lấy từ preference.posterTraits (đã lưu trong roommatePreferences)
    if (seekerRequiredTraits.length === 0) {
      // Seeker không yêu cầu traits → Bỏ qua
    } else if (postPersonalTraits.length === 0) {
      // Seeker yêu cầu traits nhưng Poster không có traits → FAIL
      return { isMatch: false, matchScore: 0, condition1, condition2: false };
    } else {
      // Cả hai đều có traits → Kiểm tra matching
      const commonTraits2 = postPersonalTraits.filter(trait => seekerRequiredTraits.includes(trait));
      if (commonTraits2.length > 0) {
        condition2Score += (commonTraits2.length / Math.max(seekerRequiredTraits.length, 1)) * 30;
      } else {
        return { isMatch: false, matchScore: 0, condition1, condition2: false };
      }
    }

    // Giá thuê: Post maxPrice <= Seeker maxPrice (từ preference.requirements.maxPrice)
    if (postRequirements.maxPrice <= seekerRequirements.maxPrice) {
      condition2Score += 20;
    } else {
      return { isMatch: false, matchScore: 0, condition1, condition2: false };
    }

    // Tính điểm tổng (trung bình của 2 chiều)
    matchScore = Math.round((condition1Score + condition2Score) / 2);
    condition2 = true;

    return { isMatch, matchScore: Math.min(matchScore, 100), condition1, condition2 };
  }

  /**
   * Lấy thông tin người tìm phòng
   */
  private async getSeekerProfile(seekerId: number, personalInfo?: any, seekerRequirements?: any): Promise<any> {
    // Nếu có personalInfo từ request → Ưu tiên sử dụng
    if (personalInfo && personalInfo.age) {
      return {
        age: personalInfo.age,
        gender: personalInfo.gender || 'other',
        // Sử dụng traits từ seekerRequirements (FE gửi) thay vì habits
        traits: seekerRequirements?.traits || personalInfo.traits || [],
      };
    }

    // Lấy từ verification nếu có
    let age = 25;
    let gender = 'other';
    
    try {
      const verification = await this.verificationModel.findOne({ userId: seekerId, status: 'approved' }).exec();
      
      if (verification && verification.dateOfBirth) {
        age = AgeUtils.calculateAge(verification.dateOfBirth);
        gender = verification.gender || 'other';
      }
    } catch (error) {
      // Verification không available, sử dụng mặc định
    }
    
    // Sử dụng traits từ seekerRequirements (FE gửi) thay vì habits
    const traits = seekerRequirements?.traits || personalInfo?.traits || [];
    
    return {
      age,
      gender,
      traits,
    };
  }

  /**
   * Lấy tuổi từ personalInfo
   */
  private getAgeFromPersonalInfo(personalInfo: any): number {
    if (!personalInfo || !personalInfo.dateOfBirth) {
      return 25; // Mặc định
    }
    return AgeUtils.calculateAge(personalInfo.dateOfBirth);
  }

  /**
   * Lấy địa chỉ phòng
   */
  private getRoomAddress(room: Room): string {
    if (room.address) {
      return `${room.address.street || ''} ${room.address.ward || ''} ${room.address.city || ''}`.trim();
    }
    return '';
  }


  /**
   * Tự động ẩn bài đăng khi contract kết thúc
   */
  async hidePostsWhenContractExpires(roomId: number): Promise<void> {
    // Tìm tất cả preferences của phòng
    const preferences = await this.preferenceModel.find({ roomId, enabled: true }).exec();

    for (const preference of preferences) {
      if (preference.postId) {
        await this.hidePost(preference.postId);
      }
      preference.enabled = false;
      await preference.save();
    }
  }

  /**
   * Lấy bài đăng từ roomId
   */
  async getPostByRoomId(userId: number, roomId: number): Promise<Post | null> {
    const preference = await this.preferenceModel.findOne({ userId, roomId }).exec();
    if (!preference || !preference.postId) {
      return null;
    }

    // Validate postId
    const postId = Number(preference.postId);
    if (isNaN(postId) || postId <= 0) {
      console.error(`[ERROR] Invalid postId in preference: ${preference.postId}`);
      return null;
    }

    return this.postModel.findOne({ postId }).exec();
  }

  /**
   * Helper methods
   */
  private async getNextPreferenceId(): Promise<number> {
    const lastPreference = await this.preferenceModel.findOne().sort({ preferenceId: -1 }).exec();
    return lastPreference ? lastPreference.preferenceId + 1 : 1;
  }


  private async getNextSeekerPreferenceId(): Promise<number> {
    const lastPreference = await this.seekerPreferenceModel.findOne().sort({ seekerPreferenceId: -1 }).exec();
    return lastPreference ? lastPreference.seekerPreferenceId + 1 : 1;
  }
}

