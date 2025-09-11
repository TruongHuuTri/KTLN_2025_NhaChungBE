import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyRegistrationDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'OTP phải có đúng 6 chữ số' })
  otp: string;
}
