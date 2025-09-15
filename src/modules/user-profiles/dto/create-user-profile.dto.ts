import { IsOptional, IsNumber, IsString, IsArray, IsBoolean, IsEnum, Min, Max, ValidateNested, IsUrl, IsDateString } from 'class-validator';
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
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
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
  @IsOptional()
  @IsString()
  preferredCity?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredWards?: string[];

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
  @IsString()
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
  @IsString()
  businessType?: string;

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  propertiesCount?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  propertyTypes?: string[];

  @IsOptional()
  @IsString()
  targetCity?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetWards?: string[];


  @IsOptional()
  @ValidateNested()
  @Type(() => PriceRangeDto)
  priceRange?: PriceRangeDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetTenants?: string[];

  @IsOptional()
  @IsString()
  managementStyle?: string;

  @IsOptional()
  @IsString()
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
