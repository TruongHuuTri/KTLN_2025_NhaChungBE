import { IsBoolean, IsOptional, IsArray, ValidateNested, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RequirementsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  ageRange: [number, number];

  @IsEnum(['male', 'female', 'any'])
  gender: 'male' | 'female' | 'any';

  @IsOptional()
  @IsArray()
  traits?: string[];

  @IsNumber()
  @Min(0)
  maxPrice: number;
}

export class UpdateRoommatePreferenceDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => RequirementsDto)
  requirements?: RequirementsDto;
}

