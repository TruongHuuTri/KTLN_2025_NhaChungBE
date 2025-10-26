import { IsOptional, IsNumber, IsString, IsArray, IsBoolean, Min, Max, ValidateNested, IsDateString } from 'class-validator';
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
  @IsArray()
  @IsString({ each: true })
  preferredWardCodes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredDistricts?: string[];

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

  // Contact info
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contactMethod?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AvailableTimeDto)
  availableTime?: AvailableTimeDto;
}
