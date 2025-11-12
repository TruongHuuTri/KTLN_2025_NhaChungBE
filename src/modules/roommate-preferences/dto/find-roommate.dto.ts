import { IsArray, IsEnum, IsNumber, IsOptional, Min, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PersonalInfoDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: 'male' | 'female' | 'other';

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hobbies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  habits?: string[];

  @IsOptional()
  @IsEnum(['early', 'normal', 'late'])
  lifestyle?: 'early' | 'normal' | 'late';

  @IsOptional()
  @IsEnum(['very_clean', 'clean', 'normal', 'flexible'])
  cleanliness?: 'very_clean' | 'clean' | 'normal' | 'flexible';
}

export class FindRoommateDto {
  @IsArray()
  @IsNumber({}, { each: true })
  ageRange: [number, number];

  @IsEnum(['male', 'female', 'any'])
  gender: 'male' | 'female' | 'any';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  traits?: string[];

  @IsNumber()
  @Min(0)
  maxPrice: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PersonalInfoDto)
  personalInfo?: PersonalInfoDto;
}

