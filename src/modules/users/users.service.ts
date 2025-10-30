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
import { EmailService } from '../../shared/services/email.service';

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
    private emailService: EmailService,
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
    return this.userModel.find({ isActive: true }).select('-password').exec();
  }

  async findAllForAdmin(): Promise<User[]> {
    // Admin can see all users (including inactive ones)
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
    const user = await this.userModel.findOne({ email, isActive: true }).exec();
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

  async updateUserStatus(id: string, isActive: boolean): Promise<{ message: string; user: any }> {
    const numericUserId = parseInt(id);
    const user = await this.userModel.findOne({ userId: numericUserId }).exec();
    
    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    // Update user status
    const updatedUser = await this.userModel.findOneAndUpdate(
      { userId: numericUserId },
      { isActive, updatedAt: new Date() },
      { new: true }
    ).select('-password').exec();

    const statusText = isActive ? 'kích hoạt' : 'vô hiệu hóa';
    return { 
      message: `${statusText} user thành công`,
      user: updatedUser
    };
  }

  async resetUserPassword(id: string): Promise<{ message: string; newPassword: string }> {
    const numericUserId = parseInt(id);
    const user = await this.userModel.findOne({ userId: numericUserId }).exec();
    
    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    // Generate new random password
    const newPassword = this.generateRandomPassword();
    
    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    await this.userModel.updateOne(
      { userId: numericUserId },
      { 
        password: hashedPassword,
        updatedAt: new Date()
      }
    ).exec();

    // Send new password via email
    try {
      await this.emailService.sendPasswordResetEmail(user.email, user.name, newPassword);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Don't throw error here, just log it
    }

    return { 
      message: 'Đặt lại mật khẩu thành công. Mật khẩu mới đã được gửi qua email.',
      newPassword: newPassword // Return for admin reference, but email is primary
    };
  }

  private generateRandomPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  async remove(id: string): Promise<{ message: string }> {
    const numericUserId = parseInt(id);
    const user = await this.userModel.findOne({ userId: numericUserId }).exec();
    
    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    if (!user.isActive) {
      throw new BadRequestException('User đã bị xóa');
    }

    // Soft delete - set isActive to false
    await this.userModel.updateOne(
      { userId: numericUserId },
      { isActive: false, updatedAt: new Date() }
    ).exec();

    return { message: 'Xóa user thành công' };
  }

  async login(loginDto: LoginDto) {
    // Find user by email
    const user = await this.userModel.findOne({ email: loginDto.email }).exec();
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
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
        .select('verificationId status submittedAt reviewedAt adminNote faceMatchResult gender fullName dateOfBirth')
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
    landlordInfo: {
      landlordId: number;
      name: string;
      phone: string;
      email: string;
    };
  }>> {
    try {
      // Lấy các hợp đồng mà user là tenant
      const contracts = await this.contractModel.find({ 'tenants.tenantId': userId }).exec();

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
        landlordInfo: {
          landlordId: number;
          name: string;
          phone: string;
          email: string;
        };
      }> = [];

      for (const contract of contracts) {
        // Lấy thông tin phòng
        const room = await this.roomModel.findOne({ roomId: contract.roomId }).exec();
        if (!room) continue;

        // Lấy thông tin tòa nhà
        let building;
        try {
          building = await this.buildingModel.findById(room.buildingId).exec();
        } catch (error) {
          building = await this.buildingModel.findOne({ buildingId: room.buildingId }).exec();
        }

        // Lấy thông tin chủ trọ
        const landlord = await this.userModel.findOne({ userId: room.landlordId }).exec();

        userRooms.push({
          roomId: room.roomId,
          roomNumber: room.roomNumber,
          buildingName: building ? building.name : 'N/A',
          buildingId: room.buildingId,
          contractId: contract.contractId,
          contractStatus: contract.status,
          startDate: contract.startDate,
          endDate: contract.endDate,
          monthlyRent: contract.monthlyRent ?? room.price,
          deposit: contract.deposit ?? room.deposit,
          area: room.area,
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
