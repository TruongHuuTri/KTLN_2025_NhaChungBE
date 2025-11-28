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
      // Nếu chưa có preference, vẫn trả về tuổi và giới tính từ verification
      let posterAge: number | null = null;
      let posterGender: string | null = null;
      
      try {
        const verification = await this.verificationModel.findOne({ userId, status: 'approved' }).exec();
        if (verification && verification.dateOfBirth && verification.gender) {
          posterAge = AgeUtils.calculateAge(verification.dateOfBirth);
          posterGender = verification.gender;
        }
      } catch (error) {
        // Verification không available
      }
      
      return {
        enabled: false,
        postId: null,
        postStatus: null,
        requirements: null,
        posterAge: posterAge,
        posterGender: posterGender,
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

    // Nếu có preference nhưng chưa có tuổi/giới tính, lấy từ verification
    let posterAge = preference.posterAge;
    let posterGender = preference.posterGender;
    
    if (!posterAge || !posterGender) {
      try {
        const verification = await this.verificationModel.findOne({ userId, status: 'approved' }).exec();
        if (verification && verification.dateOfBirth && verification.gender) {
          if (!posterAge) {
            posterAge = AgeUtils.calculateAge(verification.dateOfBirth);
          }
          if (!posterGender) {
            posterGender = verification.gender;
          }
        }
      } catch (error) {
        // Verification không available
      }
    }

    return {
      enabled: preference.enabled,
      postId: preference.postId || null,
      postStatus,
      requirements: preference.requirements || null,
      posterTraits: preference.posterTraits || [],
      posterAge: posterAge,
      posterGender: posterGender,
      posterSmoking: preference.posterSmoking || null,
      posterPets: preference.posterPets || null,
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

    // Lấy tuổi và gender của Poster từ verification và lưu vào preferences
    const verification = await this.verificationModel.findOne({ userId, status: 'approved' }).exec();
    
    if (!verification || !verification.dateOfBirth || !verification.gender) {
      throw new BadRequestException('Vui lòng xác thực lại tài khoản để sử dụng tính năng này');
    }
    
    const posterAge = AgeUtils.calculateAge(verification.dateOfBirth);
    const posterGender = verification.gender;

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
      // Lưu tuổi và gender của Poster
      preference.posterAge = posterAge;
      preference.posterGender = posterGender;
      // Lưu smoking và pets của Poster
      if ((preferenceData as any).posterSmoking !== undefined) {
        preference.posterSmoking = (preferenceData as any).posterSmoking;
      }
      if ((preferenceData as any).posterPets !== undefined) {
        preference.posterPets = (preferenceData as any).posterPets;
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
        posterAge: posterAge,
        posterGender: posterGender,
        posterSmoking: (preferenceData as any).posterSmoking || undefined,
        posterPets: (preferenceData as any).posterPets || undefined,
      });
    }

    // Xử lý bài đăng: Kiểm tra đã có postId trước (quan trọng: kiểm tra TRƯỚC khi save preference)
    if (preference.enabled) {
      if (preference.postId) {
        // Đã có bài đăng → Cập nhật requirements và personalInfo
        const postId = Number(preference.postId);
        if (!isNaN(postId) && postId > 0) {
          if (preferenceData.requirements) {
            await this.updatePostRequirements(postId, preferenceData.requirements);
          }
          // Cập nhật thêm posterSmoking, posterPets vào bài đăng
          await this.updatePostPersonalInfo(postId, preference);
          await preference.save();
          const post = await this.postModel.findOne({ postId }).exec();
          return { preference, post };
        }
      } else if (preferenceData.requirements) {
        // Chưa có bài đăng → Tạo mới
        // Truyền thêm posterTraits, posterSmoking, posterPets vào requirements để lưu vào post
        const requirementsWithPosterInfo = {
          ...preferenceData.requirements,
          posterTraits: (preferenceData as any).posterTraits,
          posterSmoking: (preferenceData as any).posterSmoking,
          posterPets: (preferenceData as any).posterPets,
        };
        const post = await this.autoCreatePost(userId, roomId, requirementsWithPosterInfo);
        preference.postId = post.postId;
        await preference.save();
        return { preference, post };
      }
    } else if (preference.postId) {
      // Nếu disabled, ẩn bài đăng
      const postId = Number(preference.postId);
      if (!isNaN(postId) && postId > 0) {
        await this.hidePost(postId);
      }
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

    // Cập nhật personalInfo với posterSmoking và posterPets nếu có trong requirements
    if (requirements.posterSmoking) {
      personalInfo.smoking = requirements.posterSmoking;
    }
    if (requirements.posterPets) {
      personalInfo.pets = requirements.posterPets;
    }

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
        smokingPreference: requirements.smokingPreference || 'any',
        petsPreference: requirements.petsPreference || 'any',
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

    // Lấy từ verification (bắt buộc)
    const verification = await this.verificationModel.findOne({ userId, status: 'approved' }).exec();
    
    if (!verification || !verification.dateOfBirth || !verification.gender) {
      throw new BadRequestException('Vui lòng xác thực lại tài khoản để sử dụng tính năng này');
    }
    
    const dateOfBirth = new Date(verification.dateOfBirth);
    const gender = verification.gender;

    // Lấy occupation từ profile nếu có
    const occupation = userProfile?.occupation || '';

    // Lấy pets từ profile (có thể là boolean)
    const pets = userProfile?.pets ? 'has_pets' : 'no_pets';

    // Tạo mặc định cho các trường còn lại
    return {
      fullName,
      dateOfBirth,
      gender,
      occupation,
      lifestyle: 'normal',
      cleanliness: 'normal',
      pets: pets,
      // smoking không có trong userProfile, sẽ lấy từ preferences hoặc để undefined
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
    const updateData: any = {
      'requirements.ageRange': requirements.ageRange,
      'requirements.gender': requirements.gender,
      'requirements.traits': requirements.traits || [],
      'requirements.maxPrice': requirements.maxPrice,
      updatedAt: new Date(),
    };

    // Cập nhật smoking và pets preference nếu có
    if (requirements.smokingPreference !== undefined) {
      updateData['requirements.smokingPreference'] = requirements.smokingPreference;
    }
    if (requirements.petsPreference !== undefined) {
      updateData['requirements.petsPreference'] = requirements.petsPreference;
    }

    await this.postModel.findOneAndUpdate(
      { postId },
      updateData,
    ).exec();
  }

  /**
   * Cập nhật personal info của bài đăng (posterTraits, posterSmoking, posterPets)
   */
  private async updatePostPersonalInfo(postId: number, preference: RoommatePreference): Promise<void> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Cập nhật personalInfo nếu có thay đổi
    if (preference.posterTraits !== undefined) {
      // PersonalInfo trong Post không có posterTraits, nên không cần cập nhật
      // Nhưng có thể cập nhật personalInfo.smoking và personalInfo.pets nếu cần
    }

    // Cập nhật personalInfo.smoking và personalInfo.pets nếu có
    if (preference.posterSmoking !== undefined) {
      updateData['personalInfo.smoking'] = preference.posterSmoking;
    }
    if (preference.posterPets !== undefined) {
      updateData['personalInfo.pets'] = preference.posterPets;
    }

    // Chỉ update nếu có dữ liệu
    if (Object.keys(updateData).length > 1) {
      await this.postModel.findOneAndUpdate(
        { postId },
        updateData,
      ).exec();
    }
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
      // Nếu chưa có preferences, vẫn trả về tuổi và giới tính từ verification
      let seekerAge: number | null = null;
      let seekerGender: string | null = null;
      
      try {
        const verification = await this.verificationModel.findOne({ userId: seekerId, status: 'approved' }).exec();
        if (verification && verification.dateOfBirth && verification.gender) {
          seekerAge = AgeUtils.calculateAge(verification.dateOfBirth);
          seekerGender = verification.gender;
        }
      } catch (error) {
        // Verification không available
      }
      
      return {
        hasPreferences: false,
        requirements: null,
        seekerTraits: null,
        seekerAge: seekerAge,
        seekerGender: seekerGender,
      };
    }

    // Nếu có preferences nhưng chưa có tuổi/giới tính, lấy từ verification
    let seekerAge = seekerPreference.seekerAge;
    let seekerGender = seekerPreference.seekerGender;
    
    if (!seekerAge || !seekerGender) {
      try {
        const verification = await this.verificationModel.findOne({ userId: seekerId, status: 'approved' }).exec();
        if (verification && verification.dateOfBirth && verification.gender) {
          if (!seekerAge) {
            seekerAge = AgeUtils.calculateAge(verification.dateOfBirth);
          }
          if (!seekerGender) {
            seekerGender = verification.gender;
          }
        }
      } catch (error) {
        // Verification không available
      }
    }

    return {
      hasPreferences: true,
      requirements: seekerPreference.requirements || null,
      seekerTraits: seekerPreference.seekerTraits || [],
      seekerAge: seekerAge,
      seekerGender: seekerGender,
      seekerSmoking: seekerPreference.seekerSmoking || null,
      seekerPets: seekerPreference.seekerPets || null,
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
    
    // Sử dụng tuổi và gender từ seekerPreference nếu có, nếu không thì tính từ personalInfo
    // personalInfo đã được lấy từ verification (bắt buộc) trong getPersonalInfoFromProfile
    const age = seekerPreference.seekerAge ?? this.getAgeFromPersonalInfo(personalInfo);
    const gender = seekerPreference.seekerGender ?? personalInfo.gender;

    // Tạo FindRoommateDto từ preferences đã lưu + personalInfo
    const findRoommateDto: FindRoommateDto = {
      ageRange: seekerPreference.requirements.ageRange as [number, number],
      gender: seekerPreference.requirements.gender as 'male' | 'female' | 'any',
      traits: seekerPreference.seekerTraits || seekerPreference.requirements.traits || [],
      maxPrice: seekerPreference.requirements.maxPrice,
      smokingPreference: seekerPreference.requirements.smokingPreference || 'any',
      petsPreference: seekerPreference.requirements.petsPreference || 'any',
      personalInfo: {
        fullName: personalInfo.fullName,
        // Hiển thị tuổi và gender từ preferences (đã lưu từ verification) nhưng không cho sửa
        gender: gender, // Hiển thị trong form nhưng không cho sửa
        occupation: personalInfo.occupation,
        lifestyle: personalInfo.lifestyle,
        cleanliness: personalInfo.cleanliness,
        smoking: seekerPreference.seekerSmoking || personalInfo.smoking,
        pets: seekerPreference.seekerPets || personalInfo.pets,
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
        smokingPreference: findRoommateDto.smokingPreference || 'any',
        petsPreference: findRoommateDto.petsPreference || 'any',
      };

      const seekerTraits = findRoommateDto.traits || [];

      // Lấy tuổi và gender của Seeker từ verification và lưu vào preferences
      const verification = await this.verificationModel.findOne({ userId: seekerId, status: 'approved' }).exec();
      
      if (!verification || !verification.dateOfBirth || !verification.gender) {
        throw new BadRequestException('Vui lòng xác thực lại tài khoản để sử dụng tính năng này');
      }
      
      const seekerAge = AgeUtils.calculateAge(verification.dateOfBirth);
      const seekerGender = verification.gender;

      // Lấy smoking và pets từ personalInfo hoặc userProfile
      const userProfile = await this.userProfileModel.findOne({ userId: seekerId }).exec();
      const seekerSmoking = findRoommateDto.personalInfo?.smoking || undefined;
      const seekerPets = findRoommateDto.personalInfo?.pets || (userProfile?.pets !== undefined ? (userProfile.pets ? 'has_pets' : 'no_pets') : undefined);

      if (seekerPreference) {
        // Cập nhật preferences
        seekerPreference.requirements = requirements as any;
        seekerPreference.seekerTraits = seekerTraits;
        // Lưu tuổi và gender của Seeker
        seekerPreference.seekerAge = seekerAge;
        seekerPreference.seekerGender = seekerGender;
        // Lưu smoking và pets của Seeker
        if (seekerSmoking) {
          seekerPreference.seekerSmoking = seekerSmoking;
        }
        if (seekerPets) {
          seekerPreference.seekerPets = seekerPets;
        }
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
          seekerAge: seekerAge,
          seekerGender: seekerGender,
          seekerSmoking: seekerSmoking || undefined,
          seekerPets: seekerPets || undefined,
        });
        await seekerPreference.save();
      }
    } catch (error) {
      // Không throw error để không ảnh hưởng đến flow tìm phòng
    }
  }

  /**
   * Tìm phòng ở ghép (matching)
   */
  async findRoommate(seekerId: number, findRoommateDto: FindRoommateDto): Promise<any> {
    // Lưu preferences của Seeker (tự động lưu/update mỗi khi tìm phòng)
    await this.saveSeekerPreferences(seekerId, findRoommateDto);
    
    // Lấy seekerPreference để lấy tuổi và gender đã lưu
    const seekerPreference = await this.seekerPreferenceModel.findOne({ userId: seekerId }).exec();
    
    // Lấy thông tin người tìm phòng (ưu tiên từ preferences, nếu không có thì từ verification)
    const seekerProfile = await this.getSeekerProfile(seekerId, findRoommateDto.personalInfo, findRoommateDto, seekerPreference?.seekerAge, seekerPreference?.seekerGender);
    
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

        // Kiểm tra xem seeker đã thuê phòng này chưa (có contract active)
        const seekerContract = await this.contractModel.findOne({
          roomId: preference.roomId,
          'tenants.tenantId': seekerId,
          status: 'active',
        }).exec();

        // Nếu seeker đã thuê phòng này rồi thì bỏ qua
        if (seekerContract) {
          continue;
        }

        // Lấy personalInfo từ user/profile
        const userProfile = await this.userProfileModel.findOne({ userId: preference.userId }).exec();
        const personalInfo = await this.getPersonalInfoFromProfile(preference.userId, userProfile);
        
        // Sử dụng tuổi và gender từ preference nếu có, nếu không thì tính từ personalInfo
        const posterAge = preference.posterAge ?? this.getAgeFromPersonalInfo(personalInfo);
        const posterGender = preference.posterGender ?? personalInfo.gender;
        const posterSmoking = preference.posterSmoking ?? personalInfo.smoking;
        const posterPets = preference.posterPets ?? personalInfo.pets;
        
        // Cập nhật personalInfo với tuổi và gender từ preference
        const personalInfoWithAge = {
          ...personalInfo,
          age: posterAge,
          gender: posterGender,
        };
        
        // Tạo post object để sử dụng checkMatching
        const post = {
          postId: preference.postId || 0,
          userId: preference.userId,
          roomId: preference.roomId,
          requirements: preference.requirements,
          personalInfo: personalInfoWithAge,
          posterTraits: preference.posterTraits || [], // Lấy traits của Poster từ preference
          posterAge: posterAge, // Lấy tuổi từ preference
          posterGender: posterGender, // Lấy gender từ preference
          posterSmoking: posterSmoking, // Lấy smoking từ preference
          posterPets: posterPets, // Lấy pets từ preference
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
            posterAge: preference.posterAge ?? this.getAgeFromPersonalInfo(personalInfo),
            posterGender: preference.posterGender ?? personalInfo.gender,
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

    // Sử dụng tuổi từ post.posterAge nếu có, nếu không thì tính từ personalInfo
    const posterAge = (post as any).posterAge ?? this.getAgeFromPersonalInfo(post.personalInfo);
    // Sử dụng tuổi từ seekerProfile (đã được lấy từ seekerPreference hoặc request)
    const seekerAge = seekerProfile.age;

    // Normalize traits (case-insensitive)
    const postTraits = this.normalizeTraits(postRequirements.traits || []);
    const seekerTraits = this.normalizeTraits(seekerProfile.traits || []);
    const seekerRequiredTraits = this.normalizeTraits(seekerRequirements.traits || []);
    // Poster traits: lấy từ preference.posterTraits (đã lưu trong roommatePreferences)
    const postPersonalTraits = this.normalizeTraits((post as any).posterTraits || []);

    // Lấy thông tin smoking và pets
    const posterSmoking = (post as any).posterSmoking ?? post.personalInfo?.smoking ?? undefined;
    const posterPets = (post as any).posterPets ?? (post.personalInfo?.pets ? (typeof post.personalInfo.pets === 'string' ? post.personalInfo.pets : (post.personalInfo.pets ? 'has_pets' : 'no_pets')) : undefined);
    const seekerSmoking = seekerProfile.smoking ?? undefined;
    const seekerPets = seekerProfile.pets ? (typeof seekerProfile.pets === 'string' ? seekerProfile.pets : 'has_pets') : 'no_pets';

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

    // Smoking: Seeker smoking phù hợp với Post requirement
    const postSmokingReq = postRequirements.smokingPreference || 'any';
    if (postSmokingReq === 'any') {
      // Không tính điểm nhưng không fail
    } else if (!seekerSmoking) {
      // Seeker chưa cung cấp thông tin smoking → Bỏ qua (backward compatibility)
    } else if (postSmokingReq === 'non_smoker' && seekerSmoking !== 'non_smoker') {
      return { isMatch: false, matchScore: 0, condition1: false, condition2: false };
    } else if (postSmokingReq === 'smoker' && seekerSmoking !== 'smoker') {
      return { isMatch: false, matchScore: 0, condition1: false, condition2: false };
    }

    // Pets: Seeker pets phù hợp với Post requirement
    const postPetsReq = postRequirements.petsPreference || 'any';
    if (postPetsReq === 'any') {
      // Không tính điểm nhưng không fail
    } else if (!seekerPets) {
      // Seeker chưa cung cấp thông tin pets → Bỏ qua (backward compatibility)
    } else if (postPetsReq === 'no_pets' && seekerPets !== 'no_pets') {
      return { isMatch: false, matchScore: 0, condition1: false, condition2: false };
    } else if (postPetsReq === 'has_pets' && seekerPets !== 'has_pets') {
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
    // Sử dụng posterGender từ preference (đã lưu từ verification)
    const posterGender = (post as any).posterGender ?? post.personalInfo?.gender;
    if (seekerRequirements.gender === 'any' || posterGender === seekerRequirements.gender) {
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

    // Smoking: Poster smoking phù hợp với Seeker requirement
    const seekerSmokingReq = seekerRequirements.smokingPreference || 'any';
    if (seekerSmokingReq === 'any') {
      // Không tính điểm nhưng không fail
    } else if (!posterSmoking) {
      // Poster chưa cung cấp thông tin smoking → Bỏ qua (backward compatibility)
    } else if (seekerSmokingReq === 'non_smoker' && posterSmoking !== 'non_smoker') {
      return { isMatch: false, matchScore: 0, condition1, condition2: false };
    } else if (seekerSmokingReq === 'smoker' && posterSmoking !== 'smoker') {
      return { isMatch: false, matchScore: 0, condition1, condition2: false };
    }

    // Pets: Poster pets phù hợp với Seeker requirement
    const seekerPetsReq = seekerRequirements.petsPreference || 'any';
    if (seekerPetsReq === 'any') {
      // Không tính điểm nhưng không fail
    } else if (!posterPets) {
      // Poster chưa cung cấp thông tin pets → Bỏ qua (backward compatibility)
    } else if (seekerPetsReq === 'no_pets' && posterPets !== 'no_pets') {
      return { isMatch: false, matchScore: 0, condition1, condition2: false };
    } else if (seekerPetsReq === 'has_pets' && posterPets !== 'has_pets') {
      return { isMatch: false, matchScore: 0, condition1, condition2: false };
    }

    // Tính điểm tổng (trung bình của 2 chiều)
    matchScore = Math.round((condition1Score + condition2Score) / 2);
    condition2 = true;

    return { isMatch, matchScore: Math.min(matchScore, 100), condition1, condition2 };
  }

  /**
   * Lấy thông tin người tìm phòng
   * Tuổi và giới tính ưu tiên lấy từ preferences (đã lưu), nếu không có thì lấy từ verification
   * Nếu không có verification thì throw error
   */
  private async getSeekerProfile(seekerId: number, personalInfo?: any, seekerRequirements?: any, seekerAgeFromPreference?: number, seekerGenderFromPreference?: string): Promise<any> {
    // Ưu tiên: 1. preferences (đã lưu), 2. verification
    let age: number;
    let gender: string;
    
    if (seekerAgeFromPreference && seekerGenderFromPreference) {
      // Ưu tiên 1: Tuổi và gender từ seekerPreference (đã lưu)
      age = seekerAgeFromPreference;
      gender = seekerGenderFromPreference;
    } else {
      // Ưu tiên 2: Lấy từ verification
      const verification = await this.verificationModel.findOne({ userId: seekerId, status: 'approved' }).exec();
      
      if (!verification || !verification.dateOfBirth || !verification.gender) {
        throw new BadRequestException('Vui lòng xác thực lại tài khoản để sử dụng tính năng này');
      }
      
      age = AgeUtils.calculateAge(verification.dateOfBirth);
      gender = verification.gender;
    }
    
    // Sử dụng traits từ seekerRequirements (FE gửi)
    const traits = seekerRequirements?.traits || personalInfo?.traits || [];
    
    // Lấy smoking và pets từ personalInfo hoặc seekerPreference
    const seekerPreference = await this.seekerPreferenceModel.findOne({ userId: seekerId }).exec();
    const smoking = personalInfo?.smoking || seekerPreference?.seekerSmoking || undefined;
    const pets = personalInfo?.pets 
      ? (personalInfo.pets === 'has_pets' ? 'has_pets' : 'no_pets')
      : (seekerPreference?.seekerPets || undefined);
    
    // Nếu không có trong personalInfo hoặc seekerPreference, lấy từ userProfile
    let petsFromProfile: string | undefined = undefined;
    if (!pets) {
      const userProfile = await this.userProfileModel.findOne({ userId: seekerId }).exec();
      if (userProfile?.pets !== undefined) {
        petsFromProfile = userProfile.pets ? 'has_pets' : 'no_pets';
      }
    }
    
    return {
      age,
      gender,
      traits,
      smoking: smoking,
      pets: pets || petsFromProfile || undefined,
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

