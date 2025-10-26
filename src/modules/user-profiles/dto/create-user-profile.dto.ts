import { IsOptional, IsString, IsArray, IsBoolean, IsNumber } from 'class-validator';

export class CreateUserProfileDto {
  @IsNumber()
  userId: number;

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
  roomType?: string[];

  // Basic Info
  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsBoolean()
  pets?: boolean;

  // Contact info
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contactMethod?: string[];
}
