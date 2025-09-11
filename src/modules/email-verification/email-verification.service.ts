import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailVerification, EmailVerificationDocument } from './schemas/email-verification.schema';
import { EmailService } from '../../shared/services/email.service';

@Injectable()
export class EmailVerificationService {
  constructor(
    @InjectModel(EmailVerification.name)
    private emailVerificationModel: Model<EmailVerificationDocument>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Tạo và gửi OTP cho đăng ký
   */
  async createAndSendOTP(email: string, userName: string): Promise<string> {
    // Xóa OTP cũ nếu có
    await this.emailVerificationModel.deleteMany({ email, type: 'registration' });

    // Tạo OTP mới
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    // Tạo verificationId
    const verificationId = await this.generateVerificationId();

    // Lưu vào database
    const emailVerification = new this.emailVerificationModel({
      verificationId,
      email,
      otp,
      type: 'registration',
      expiresAt,
      isUsed: false,
    });

    await emailVerification.save();

    // Gửi email
    await this.emailService.sendOTPEmail(email, otp, userName);

    return otp;
  }

  /**
   * Tạo mã OTP 6 chữ số
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Tạo verificationId mới
   */
  private async generateVerificationId(): Promise<number> {
    const lastVerification = await this.emailVerificationModel
      .findOne({}, {}, { sort: { verificationId: -1 } });
    return lastVerification ? lastVerification.verificationId + 1 : 1;
  }

  /**
   * Xác thực OTP
   */
  async verifyOTP(email: string, otp: string): Promise<boolean> {
    const verification = await this.emailVerificationModel.findOne({
      email,
      otp,
      type: 'registration',
      isUsed: false,
    });

    if (!verification) {
      return false;
    }

    // Kiểm tra hết hạn
    if (new Date() > verification.expiresAt) {
      await this.emailVerificationModel.deleteOne({ _id: verification._id });
      return false;
    }

    // Đánh dấu đã sử dụng
    verification.isUsed = true;
    await verification.save();

    return true;
  }

  /**
   * Xóa OTP hết hạn
   */
  async cleanupExpiredOTPs(): Promise<void> {
    await this.emailVerificationModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });
  }

  /**
   * Kiểm tra email đã được xác thực chưa
   */
  async isEmailVerified(email: string): Promise<boolean> {
    const verification = await this.emailVerificationModel.findOne({
      email,
      type: 'registration',
      isUsed: true,
    });

    return !!verification;
  }
}
