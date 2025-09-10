import { IsNotEmpty, IsString, IsNumber, IsArray, IsOptional, IsIn, ValidateNested, Min, Max, IsNumberString, IsEmail, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAddressDto {
  @IsOptional()
  @IsString({ message: 'Đường phải là chuỗi' })
  street?: string;

  @IsNotEmpty({ message: 'Phường không được để trống' })
  @IsString({ message: 'Phường phải là chuỗi' })
  ward: string;

  @IsNotEmpty({ message: 'Thành phố không được để trống' })
  @IsString({ message: 'Thành phố phải là chuỗi' })
  city: string;

  @IsOptional()
  @IsString({ message: 'Địa chỉ cụ thể phải là chuỗi' })
  specificAddress?: string;

  @IsOptional()
  @IsBoolean({ message: 'Hiển thị địa chỉ cụ thể phải là boolean' })
  showSpecificAddress?: boolean;

  // Các trường mới từ API địa chỉ
  @IsNotEmpty({ message: 'Mã tỉnh không được để trống' })
  @IsString({ message: 'Mã tỉnh phải là chuỗi' })
  provinceCode: string;

  @IsNotEmpty({ message: 'Tên tỉnh không được để trống' })
  @IsString({ message: 'Tên tỉnh phải là chuỗi' })
  provinceName: string;

  @IsNotEmpty({ message: 'Mã phường/xã không được để trống' })
  @IsString({ message: 'Mã phường/xã phải là chuỗi' })
  wardCode: string;

  @IsNotEmpty({ message: 'Tên phường/xã không được để trống' })
  @IsString({ message: 'Tên phường/xã phải là chuỗi' })
  wardName: string;

  // Thông tin bổ sung
  @IsOptional()
  @IsString({ message: 'Thông tin bổ sung phải là chuỗi' })
  additionalInfo?: string;
}

export class CreateCurrentRoomDto {
  @IsNotEmpty({ message: 'Địa chỉ phòng hiện tại không được để trống' })
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address: CreateAddressDto;

  @IsNotEmpty({ message: 'Giá phòng không được để trống' })
  @IsNumber({}, { message: 'Giá phòng phải là số' })
  price: number;

  @IsNotEmpty({ message: 'Diện tích phòng không được để trống' })
  @IsNumber({}, { message: 'Diện tích phòng phải là số' })
  area: number;

  @IsNotEmpty({ message: 'Mô tả phòng không được để trống' })
  @IsString({ message: 'Mô tả phòng phải là chuỗi' })
  description: string;

  @IsOptional()
  @IsString({ message: 'Loại phòng phải là chuỗi' })
  @IsIn(['single', 'double', 'shared'], { message: 'Loại phòng phải là single, double hoặc shared' })
  roomType?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Số người hiện tại phải là số' })
  @Min(1, { message: 'Số người hiện tại phải từ 1 trở lên' })
  currentOccupants?: number;

  @IsOptional()
  @IsString({ message: 'Thời gian ở còn lại phải là chuỗi' })
  @IsIn(['1-3 months', '3-6 months', '6-12 months', 'over_1_year'], { message: 'Thời gian ở còn lại không hợp lệ' })
  remainingDuration?: string;

  // Utilities chia sẻ
  @IsOptional()
  @IsIn(['split_evenly', 'by_usage', 'included'], { message: 'shareMethod không hợp lệ' })
  shareMethod?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Ước tính tiện ích phải là số' })
  estimatedMonthlyUtilities?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Mức free tối đa phải là số' })
  capIncludedAmount?: number;

  @IsOptional() @IsNumber() electricityPricePerKwh?: number;
  @IsOptional() @IsNumber() waterPrice?: number;
  @IsOptional() @IsIn(['per_m3', 'per_person'], { message: 'waterBillingType không hợp lệ' }) @IsString()
  waterBillingType?: string;
  @IsOptional() @IsNumber() internetFee?: number;
  @IsOptional() @IsNumber() garbageFee?: number;
  @IsOptional() @IsNumber() cleaningFee?: number;
}

export class CreatePersonalInfoDto {
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString({ message: 'Họ và tên phải là chuỗi' })
  fullName: string;

  @IsNotEmpty({ message: 'Tuổi không được để trống' })
  @IsNumber({}, { message: 'Tuổi phải là số' })
  @Min(18, { message: 'Tuổi phải từ 18 trở lên' })
  @Max(100, { message: 'Tuổi không được quá 100' })
  age: number;

  @IsNotEmpty({ message: 'Giới tính không được để trống' })
  @IsIn(['male', 'female', 'other'], { message: 'Giới tính phải là male, female hoặc other' })
  gender: string;

  @IsNotEmpty({ message: 'Nghề nghiệp không được để trống' })
  @IsString({ message: 'Nghề nghiệp phải là chuỗi' })
  occupation: string;

  @IsOptional()
  @IsArray({ message: 'Sở thích phải là mảng' })
  @IsString({ each: true, message: 'Mỗi sở thích phải là chuỗi' })
  hobbies?: string[];

  @IsOptional()
  @IsArray({ message: 'Thói quen phải là mảng' })
  @IsString({ each: true, message: 'Mỗi thói quen phải là chuỗi' })
  habits?: string[];

  @IsOptional()
  @IsString({ message: 'Thói quen sinh hoạt phải là chuỗi' })
  @IsIn(['early', 'normal', 'late'], { message: 'Thói quen sinh hoạt phải là early, normal hoặc late' })
  lifestyle?: string;

  @IsOptional()
  @IsString({ message: 'Mức độ sạch sẽ phải là chuỗi' })
  @IsIn(['very_clean', 'clean', 'normal', 'flexible'], { message: 'Mức độ sạch sẽ phải là very_clean, clean, normal hoặc flexible' })
  cleanliness?: string;
}

export class CreateRequirementsDto {
  @IsNotEmpty({ message: 'Khoảng tuổi không được để trống' })
  @IsArray({ message: 'Khoảng tuổi phải là mảng' })
  @IsNumber({}, { each: true, message: 'Mỗi tuổi phải là số' })
  @Min(18, { each: true, message: 'Tuổi tối thiểu là 18' })
  @Max(100, { each: true, message: 'Tuổi tối đa là 100' })
  ageRange: number[];

  @IsNotEmpty({ message: 'Giới tính yêu cầu không được để trống' })
  @IsIn(['male', 'female', 'any'], { message: 'Giới tính yêu cầu phải là male, female hoặc any' })
  gender: string;

  @IsOptional()
  @IsArray({ message: 'Tính cách phải là mảng' })
  @IsString({ each: true, message: 'Mỗi tính cách phải là chuỗi' })
  traits?: string[];

  @IsNotEmpty({ message: 'Giá tối đa không được để trống' })
  @IsNumber({}, { message: 'Giá tối đa phải là số' })
  @Min(0, { message: 'Giá tối đa phải lớn hơn 0' })
  maxPrice: number;
}

export class CreateRoommatePostDto {
  @IsNotEmpty({ message: 'User ID không được để trống' })
  @IsNumberString({}, { message: 'User ID phải là số' })
  userId: string;

  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString({ message: 'Tiêu đề phải là chuỗi' })
  title: string;

  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  @IsString({ message: 'Mô tả phải là chuỗi' })
  description: string;

  @IsOptional()
  @IsArray({ message: 'Hình ảnh phải là mảng' })
  @IsString({ each: true, message: 'Mỗi hình ảnh phải là chuỗi' })
  images?: string[];

  @IsOptional()
  @IsString({ message: 'Video phải là chuỗi' })
  video?: string;

  @IsNotEmpty({ message: 'Thông tin phòng hiện tại không được để trống' })
  @ValidateNested()
  @Type(() => CreateCurrentRoomDto)
  currentRoom: CreateCurrentRoomDto;

  @IsNotEmpty({ message: 'Thông tin cá nhân không được để trống' })
  @ValidateNested()
  @Type(() => CreatePersonalInfoDto)
  personalInfo: CreatePersonalInfoDto;

  @IsNotEmpty({ message: 'Yêu cầu không được để trống' })
  @ValidateNested()
  @Type(() => CreateRequirementsDto)
  requirements: CreateRequirementsDto;

  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'], { message: 'Trạng thái không hợp lệ' })
  status?: string;
}
