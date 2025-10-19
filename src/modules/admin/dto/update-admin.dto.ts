import { IsString, IsOptional, MinLength, IsEmail, IsPhoneNumber, IsBoolean } from 'class-validator';

export class UpdateAdminDto {
  @IsOptional()
  @IsString({ message: 'Tên phải là chuỗi' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Mật khẩu hiện tại phải là chuỗi' })
  currentPassword?: string;

  @IsOptional()
  @IsString({ message: 'Mật khẩu mới phải là chuỗi' })
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  newPassword?: string;

  @IsOptional()
  @IsBoolean({ message: 'Trạng thái phải là boolean' })
  isActive?: boolean;
}
