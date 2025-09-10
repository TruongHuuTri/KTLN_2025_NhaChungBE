import { Injectable, NotFoundException, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument } from './schemas/user.schema';
import { Verification, VerificationDocument } from '../verifications/schemas/verification.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Verification.name) private verificationModel: Model<VerificationDocument>,
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
    const user = await this.userModel.findOne({ userId: parseInt(id) }).select('-password').exec();
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
    const result = await this.userModel.deleteOne({ userId: parseInt(id) }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Không tìm thấy user');
    }
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
        .select('verificationId status submittedAt reviewedAt adminNote')
        .exec();
    }

    return {
      isVerified: user.isVerified,
      verification: verification,
    };
  }

  private async getNextUserId(): Promise<number> {
    const lastUser = await this.userModel.findOne().sort({ userId: -1 }).exec();
    return lastUser ? lastUser.userId + 1 : 1;
  }
}
