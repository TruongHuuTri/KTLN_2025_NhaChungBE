import { Controller, Post, Put, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyRegistrationDto } from './dto/verify-registration.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Đăng ký tài khoản mới
   */
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * Xác thực OTP và tạo tài khoản
   */
  @Post('verify-registration')
  async verifyRegistration(@Body() verifyDto: VerifyRegistrationDto) {
    return this.authService.verifyRegistration(verifyDto);
  }

  /**
   * Đổi role của user
   */
  @Put('change-role/:userId')
  @UseGuards(JwtAuthGuard)
  async changeRole(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() changeRoleDto: ChangeRoleDto
  ) {
    return this.authService.changeRole(userId, changeRoleDto);
  }

  /**
   * Gửi lại OTP
   */
  @Post('resend-otp')
  async resendOTP(@Body() body: { email: string }) {
    return this.authService.resendOTP(body.email);
  }

  /**
   * Refresh token cho user đã đăng ký (trong registration flow)
   */
  @Post('refresh-registration-token')
  async refreshRegistrationToken(@Body() body: { email: string }) {
    return this.authService.refreshRegistrationToken(body.email);
  }
}
