import { IsString, IsEmail, IsOptional, IsEnum, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUserProfileDto } from './create-user-profile.dto';

export class CompleteRegistrationDto {
  // Thông tin đăng ký cơ bản
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(['user', 'landlord'])
  role: 'user' | 'landlord';

  // Thông tin profile chi tiết
  @ValidateNested()
  @Type(() => CreateUserProfileDto)
  profile: CreateUserProfileDto;
}
