import { IsString, IsNumber, IsArray, IsOptional, ValidateNested, IsBoolean, IsEnum, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

export class AddressDto {
  @IsString()
  street: string;

  @IsString()
  ward: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  specificAddress?: string;

  @IsOptional()
  @IsBoolean()
  showSpecificAddress?: boolean;

  @IsString()
  provinceCode: string;

  @IsString()
  provinceName: string;

  @IsString()
  wardCode: string;

  @IsString()
  wardName: string;

  @IsOptional()
  @IsString()
  additionalInfo?: string;
}

export class LocalMediaItemDto {
  @IsString()
  id: string;

  @IsString()
  url: string;

  @IsString()
  type: string; // 'image' | 'video'

  @IsOptional()
  @IsString()
  thumbnail?: string;
}

export class RoommateFormDto {
  // Hình ảnh và video
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocalMediaItemDto)
  images?: LocalMediaItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocalMediaItemDto)
  videos?: LocalMediaItemDto[];

  @IsOptional()
  @IsString()
  coverImageId?: string;

  // Thông tin cá nhân
  @IsString()
  fullName: string;

  @IsNumber()
  age: number;

  @IsEnum(['male', 'female', 'other'])
  gender: string;

  @IsString()
  occupation: string;

  // Thông tin phòng hiện tại
  @ValidateNested()
  @Type(() => AddressDto)
  roomAddress: AddressDto;

  @IsNumber()
  roomPrice: number;

  @IsNumber()
  roomArea: number;

  @IsString()
  roomDescription: string;

  @IsOptional()
  @IsEnum(['single', 'double', 'shared'])
  roomType?: string;

  @IsOptional()
  @IsNumber()
  currentOccupants?: number;

  @IsOptional()
  @IsEnum(['1-3 months', '3-6 months', '6-12 months', '1-2 years', '2+ years', 'indefinite'])
  remainingDuration?: string;

  // Chi phí & Dịch vụ phòng ở ghép
  @IsOptional()
  @IsEnum(['split_evenly', 'by_usage'])
  shareMethod?: string;

  @IsOptional()
  @IsNumber()
  estimatedMonthlyUtilities?: number;

  @IsOptional()
  @IsNumber()
  capIncludedAmount?: number;

  @IsOptional()
  @IsNumber()
  electricityPricePerKwh?: number;

  @IsOptional()
  @IsNumber()
  waterPrice?: number;

  @IsOptional()
  @IsEnum(['per_m3', 'per_person'])
  // removed: waterBillingType

  @IsOptional()
  @IsNumber()
  internetFee?: number;

  @IsOptional()
  @IsNumber()
  garbageFee?: number;

  @IsOptional()
  @IsNumber()
  cleaningFee?: number;

  // Sở thích và thói quen
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedHobbies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedHabits?: string[];

  @IsOptional()
  @IsEnum(['early', 'normal', 'late'])
  lifestyle?: string;

  @IsOptional()
  @IsEnum(['very_clean', 'clean', 'normal', 'flexible'])
  cleanliness?: string;

  // Yêu cầu về người ở ghép
  @IsNumber()
  ageRangeMin: number;

  @IsNumber()
  ageRangeMax: number;

  @IsEnum(['male', 'female', 'any'])
  preferredGender: string;

  @IsNumber()
  maxPrice: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedTraits?: string[];

  // Tiêu đề và mô tả
  @IsString()
  title: string;

  @IsString()
  description: string;

  // Thông tin liên hệ
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
