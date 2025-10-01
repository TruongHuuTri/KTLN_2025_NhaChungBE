import { Injectable, NotFoundException, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserProfile, UserProfileDocument } from '../user-profiles/schemas/user-profile.schema';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument } from './schemas/user.schema';
import { Verification, VerificationDocument } from '../verifications/schemas/verification.schema';
import { Room, RoomDocument } from '../rooms/schemas/room.schema';
import { Building, BuildingDocument } from '../rooms/schemas/building.schema';
import { RentalContract, RentalContractDocument } from '../contracts/schemas/rental-contract.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Verification.name) private verificationModel: Model<VerificationDocument>,
    @InjectModel(UserProfile.name) private userProfileModel: Model<UserProfileDocument>,
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(Building.name) private buildingModel: Model<BuildingDocument>,
    @InjectModel(RentalContract.name) private contractModel: Model<RentalContractDocument>,
    private jwtService: JwtService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [
        { email: createUserDto.email },
        { userId: await this.getNextUserId() }
      ]
    });

    if (existingUser) {
      throw new ConflictException('Email đã tồn tại hoặc User ID đã được sử dụng');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);

    // Get next userId
    const nextUserId = await this.getNextUserId();

    const createdUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      userId: nextUserId,
    });

    return createdUser.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().select('-password').exec();
  }

  async findOne(id: string): Promise<User> {
    const parsedId = parseInt(id);
    
    if (isNaN(parsedId)) {
      throw new BadRequestException('Invalid user ID');
    }
    
    const user = await this.userModel.findOne({ userId: parsedId }).select('-password').exec();
    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException('Không tìm thấy user với email này');
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // If password is being updated, hash it
    if (updateUserDto.password) {
      const saltRounds = 10;
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, saltRounds);
    }

    const updatedUser = await this.userModel
      .findOneAndUpdate(
        { userId: parseInt(id) },
        updateUserDto,
        { new: true }
      )
      .select('-password')
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('Không tìm thấy user');
    }

    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    const numericUserId = parseInt(id);
    const result = await this.userModel.deleteOne({ userId: numericUserId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Không tìm thấy user');
    }

    // Cascade delete related user profile to avoid orphan profile blocking future registrations
    await this.userProfileModel.deleteOne({ userId: numericUserId }).exec();
  }

  async login(loginDto: LoginDto) {
    // Find user by email
    const user = await this.userModel.findOne({ email: loginDto.email }).exec();
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // Generate JWT token
    const payload = { 
      email: user.email, 
      sub: user.userId.toString(),
      name: user.name,
      role: user.role 
    };
    
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
      }
    };
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    // Validate new password and confirm password match
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException('Mật khẩu mới và xác nhận mật khẩu không khớp');
    }

    // Find user
    const user = await this.userModel.findOne({ userId }).exec();
    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(changePasswordDto.newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, saltRounds);

    // Update password
    await this.userModel.findOneAndUpdate(
      { userId },
      { password: hashedNewPassword },
      { new: true }
    ).exec();

    return { message: 'Đổi mật khẩu thành công' };
  }

  async getVerificationStatus(userId: string): Promise<{ isVerified: boolean; verification: any }> {
    // Find user by userId number instead of ObjectId
    const user = await this.userModel
      .findOne({ userId: parseInt(userId) })
      .select('isVerified verificationId')
      .exec();

    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    let verification: any = null;
    if (user.verificationId) {
      // Find verification by verificationId number
      verification = await this.verificationModel
        .findOne({ verificationId: user.verificationId })
        .select('verificationId status submittedAt reviewedAt adminNote faceMatchResult')
        .exec();
    }

    return {
      isVerified: user.isVerified,
      verification: verification,
    };
  }

  /**
   * Lấy danh sách phòng user đã thuê
   */
  async getMyRooms(userId: number): Promise<Array<{
    roomId: number;
    roomNumber: string;
    buildingName: string;
    buildingId: number;
    contractId?: number;
    contractStatus?: string;
    startDate?: Date;
    endDate?: Date;
    monthlyRent: number;
    deposit: number;
    area: number;
    maxOccupancy: number;
    currentOccupants: number;
    landlordInfo: {
      landlordId: number;
      name: string;
      phone: string;
      email: string;
    };
  }>> {
    try {
      // Tìm tất cả phòng có user trong currentTenants
      const rooms = await this.roomModel.find({
        $or: [
          { 'currentTenants.userId': userId },
          { 'currentTenants.userId': Number(userId) }
        ]
      }).exec();

      const userRooms: Array<{
        roomId: number;
        roomNumber: string;
        buildingName: string;
        buildingId: number;
        contractId?: number;
        contractStatus?: string;
        startDate?: Date;
        endDate?: Date;
        monthlyRent: number;
        deposit: number;
        area: number;
        maxOccupancy: number;
        currentOccupants: number;
        landlordInfo: {
          landlordId: number;
          name: string;
          phone: string;
          email: string;
        };
      }> = [];

      for (const room of rooms) {
        // Lấy thông tin tòa nhà
        let building;
        try {
          building = await this.buildingModel.findById(room.buildingId).exec();
        } catch (error) {
          building = await this.buildingModel.findOne({ buildingId: room.buildingId }).exec();
        }

        // Lấy thông tin chủ trọ
        const landlord = await this.userModel.findOne({ userId: room.landlordId }).exec();

        // Tìm hợp đồng liên quan (nếu có)
        const contract = await this.contractModel.findOne({
          roomId: room.roomId,
          'tenants.tenantId': userId
        }).exec();

        userRooms.push({
          roomId: room.roomId,
          roomNumber: room.roomNumber,
          buildingName: building ? building.name : 'N/A',
          buildingId: room.buildingId,
          contractId: contract ? contract.contractId : undefined,
          contractStatus: contract ? contract.status : 'unknown',
          startDate: contract ? contract.startDate : undefined,
          endDate: contract ? contract.endDate : undefined,
          monthlyRent: room.price, // Sử dụng price từ room
          deposit: room.deposit,
          area: room.area,
          maxOccupancy: room.maxOccupancy,
          currentOccupants: room.currentOccupants,
          landlordInfo: landlord ? {
            landlordId: landlord.userId,
            name: landlord.name,
            phone: landlord.phone || '',
            email: landlord.email
          } : {
            landlordId: 0,
            name: 'N/A',
            phone: '',
            email: 'N/A'
          }
        });
      }

      return userRooms;
    } catch (error) {
      throw new Error(`Failed to get user rooms: ${error.message}`);
    }
  }

  private async getNextUserId(): Promise<number> {
    const lastUser = await this.userModel.findOne().sort({ userId: -1 }).exec();
    return lastUser ? lastUser.userId + 1 : 1;
  }
}
