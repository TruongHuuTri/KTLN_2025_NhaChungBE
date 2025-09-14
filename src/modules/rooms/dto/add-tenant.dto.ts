import { IsString, IsNumber, IsEnum } from 'class-validator';

export class AddTenantDto {
  @IsNumber()
  userId: number;

  @IsString()
  fullName: string;

  @IsNumber()
  age: number;

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
