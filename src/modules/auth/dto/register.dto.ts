import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: 'Tên phải có ít nhất 2 ký tự' })
  name: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsIn(['user', 'landlord'], { message: 'Role phải là user hoặc landlord' })
  role: 'user' | 'landlord';
}
