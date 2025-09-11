import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument } from '../users/schemas/user.schema';
import { EmailVerificationService } from '../email-verification/email-verification.service';
import { EmailService } from '../../shared/services/email.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyRegistrationDto } from './dto/verify-registration.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private tempRegistrations: Map<string, RegisterDto & { createdAt: Date }>;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
  ) {
    this.tempRegistrations = new Map();
  }

  /**
   * Đăng ký tài khoản mới - Lưu tạm thông tin và gửi OTP
   */
  async register(registerDto: RegisterDto) {
    const { name, email, password, phone, role } = registerDto;

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }

    // Lưu tạm thông tin đăng ký vào memory cache
    const tempRegistration = {
      ...registerDto,
      createdAt: new Date(),
    };

    this.tempRegistrations.set(email, tempRegistration);

    // Tạo và gửi OTP
    await this.emailVerificationService.createAndSendOTP(email, name);

    return {
      message: 'Mã OTP đã được gửi đến email của bạn',
      email,
      expiresIn: 300, // 5 phút
    };
  }

  /**
   * Xác thực OTP và tạo tài khoản
   */
  async verifyRegistration(verifyDto: VerifyRegistrationDto) {
    const { email, otp } = verifyDto;

    // Xác thực OTP
    const isValidOTP = await this.emailVerificationService.verifyOTP(email, otp);
    if (!isValidOTP) {
      throw new UnauthorizedException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    // Lấy thông tin đăng ký từ cache
    const tempRegistration = this.tempRegistrations.get(email);
    if (!tempRegistration) {
      throw new UnauthorizedException('Thông tin đăng ký không tồn tại hoặc đã hết hạn');
    }

    // Kiểm tra email đã tồn tại chưa (double check)
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(tempRegistration.password, saltRounds);

    // Tạo userId
    const lastUser = await this.userModel.findOne({}, {}, { sort: { userId: -1 } });
    const userId = lastUser ? lastUser.userId + 1 : 1;

    // Tạo user mới
    const newUser = new this.userModel({
      userId,
      name: tempRegistration.name,
      email: tempRegistration.email,
      password: hashedPassword,
      phone: tempRegistration.phone,
      role: tempRegistration.role,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    });

    const savedUser = await newUser.save();

    // Xóa thông tin tạm
    this.tempRegistrations.delete(email);

    // Trả về thông tin user (không bao gồm password)
    const { password: _, ...userWithoutPassword } = savedUser.toObject();

    return {
      message: 'Đăng ký thành công. Vui lòng đăng nhập để sử dụng tài khoản.',
      user: userWithoutPassword,
    };
  }


  /**
   * Đổi role của user
   */
  async changeRole(userId: number, changeRoleDto: ChangeRoleDto) {
    const { role } = changeRoleDto;

    const user = await this.userModel.findOne({ userId });
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    // Kiểm tra user đã verify email chưa
    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Vui lòng xác thực email trước khi đổi role');
    }

    // Cập nhật role
    user.role = role;
    await user.save();

    // Gửi email thông báo
    await this.emailService.sendRoleChangeNotification(
      user.email,
      user.name,
      role
    );

    // Trả về thông tin user (không bao gồm password)
    const { password: _, ...userWithoutPassword } = user.toObject();

    return {
      message: 'Đổi role thành công',
      user: userWithoutPassword,
    };
  }

  /**
   * Gửi lại OTP
   */
  async resendOTP(email: string) {
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }

    // Tạo và gửi OTP mới
    await this.emailVerificationService.createAndSendOTP(email, 'User');

    return {
      message: 'Mã OTP đã được gửi lại',
      email,
      expiresIn: 300,
    };
  }
}
