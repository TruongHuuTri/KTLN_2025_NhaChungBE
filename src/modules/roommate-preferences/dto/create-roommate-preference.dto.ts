import { IsBoolean, IsNumber, IsOptional, IsArray, ValidateNested, IsEnum, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class RequirementsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  ageRange: [number, number];

  @IsEnum(['male', 'female', 'any'])
  gender: 'male' | 'female' | 'any';

  @IsOptional()
  @IsArray()
  @IsArray({ each: true })
  traits?: string[];

  @IsNumber()
  @Min(0)
  maxPrice: number;
}

export class CreateRoommatePreferenceDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => RequirementsDto)
  requirements?: RequirementsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  posterTraits?: string[]; // Traits của chính Poster (người đăng bài)
}

