import { Injectable } from '@nestjs/common';
import { EmailService } from './email.service';

@Injectable()
export class OTPService {
  constructor(private readonly emailService: EmailService) {}

  /**
   * Tạo mã OTP 6 chữ số
   */
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Kiểm tra OTP có hết hạn không
   */
  isOTPExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Gửi OTP qua email
   */
  async sendOTP(email: string, userName: string): Promise<string> {
    const otp = this.generateOTP();
    
    try {
      await this.emailService.sendOTPEmail(email, otp, userName);
      return otp;
    } catch (error) {
      throw new Error('Không thể gửi mã OTP');
    }
  }

  /**
   * Test gửi email
   */
  async testEmailService(): Promise<void> {
    try {
      await this.emailService.testConnection();
    } catch (error) {
      console.error('❌ Email service test failed:', error);
      throw error;
    }
  }
}
