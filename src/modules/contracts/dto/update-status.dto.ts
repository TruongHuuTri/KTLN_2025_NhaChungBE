import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateStatusDto {
  @IsEnum(['pending', 'approved', 'rejected', 'cancelled'])
  status: string;

  @IsOptional()
  @IsString()
  responseMessage?: string;

  @IsOptional()
  @IsString()
  landlordResponse?: string;
}
