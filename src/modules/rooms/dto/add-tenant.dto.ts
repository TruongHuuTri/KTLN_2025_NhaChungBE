import { IsString, IsNumber, IsEnum, IsDateString } from 'class-validator';

export class AddTenantDto {
  @IsNumber()
  userId: number;

  @IsString()
  fullName: string;

  @IsDateString()
  dateOfBirth: string;

  @IsString()
  gender: string;

  @IsString()
  occupation: string;

  @IsString()
  moveInDate: string;

  @IsEnum(['early', 'normal', 'late'])
  lifestyle: string;

  @IsEnum(['very_clean', 'clean', 'normal', 'flexible'])
  cleanliness: string;
}
