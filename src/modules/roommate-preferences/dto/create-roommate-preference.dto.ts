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

  @IsOptional()
  @IsEnum(['smoker', 'non_smoker', 'any'])
  smokingPreference?: 'smoker' | 'non_smoker' | 'any';

  @IsOptional()
  @IsEnum(['has_pets', 'no_pets', 'any'])
  petsPreference?: 'has_pets' | 'no_pets' | 'any';
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

  @IsOptional()
  @IsEnum(['smoker', 'non_smoker'])
  posterSmoking?: 'smoker' | 'non_smoker'; // Hút thuốc của Poster

  @IsOptional()
  @IsEnum(['has_pets', 'no_pets'])
  posterPets?: 'has_pets' | 'no_pets'; // Thú cưng của Poster
}

