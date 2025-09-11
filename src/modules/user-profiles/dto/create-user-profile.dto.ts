import { IsOptional, IsNumber, IsString, IsArray, IsBoolean, IsEnum, Min, Max, ValidateNested, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class BudgetRangeDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  min?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max?: number;
}

export class PriceRangeDto {
  @IsNumber()
  @Min(0)
  min: number;

  @IsNumber()
  @Min(0)
  max: number;
}

export class BankAccountDto {
  @IsString()
  bankName: string;

  @IsString()
  accountNumber: string;

  @IsString()
  accountHolder: string;
}

export class AvailableTimeDto {
  @IsOptional()
  @IsString()
  weekdays?: string;

  @IsOptional()
  @IsString()
  weekends?: string;
}

export class CreateUserProfileDto {
  @IsNumber()
  userId: number;

  // Basic Info
  @IsOptional()
  @IsNumber()
  @Min(18)
  @Max(100)
  age?: number;

  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  income?: number;

  @IsOptional()
  @IsString()
  currentLocation?: string;

  // Preferences
  // Deprecated: preferredDistricts (giữ tạm)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredDistricts?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredWards?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredWardCodes?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => BudgetRangeDto)
  budgetRange?: BudgetRangeDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roomType?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsEnum(['quiet', 'social', 'party', 'study'])
  lifestyle?: string;

  // Roommate specific
  @IsOptional()
  @IsBoolean()
  smoking?: boolean;

  @IsOptional()
  @IsBoolean()
  pets?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  cleanliness?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  socialLevel?: number;

  // Landlord specific
  @IsOptional()
  @IsEnum(['individual', 'company', 'agency'])
  businessType?: string;

  @IsOptional()
  @IsEnum(['new', '1-2_years', '3-5_years', '5+_years'])
  experience?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  propertiesCount?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(['phong_tro','chung_cu','nha_nguyen_can','can_ho_dv','officetel','studio'], { each: true })
  propertyTypes?: string[];

  // Deprecated: targetDistricts (giữ tạm)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetDistricts?: string[];

  @IsOptional()
  @IsString()
  targetCityCode?: string;

  @IsOptional()
  @IsString()
  targetCityName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetWards?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetWardCodes?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PriceRangeDto)
  priceRange?: PriceRangeDto;

  @IsOptional()
  @IsArray()
  @IsEnum(['sinh_vien','gia_dinh','nhan_vien_vp','cap_doi','nhom_ban'], { each: true })
  targetTenants?: string[];

  @IsOptional()
  @IsEnum(['strict', 'flexible', 'friendly'])
  managementStyle?: string;

  @IsOptional()
  @IsEnum(['immediate', 'within_hour', 'within_day'])
  responseTime?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalServices?: string[];

  // Business info
  @IsOptional()
  @IsUrl()
  businessLicense?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BankAccountDto)
  bankAccount?: BankAccountDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contactMethod?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AvailableTimeDto)
  availableTime?: AvailableTimeDto;
}
