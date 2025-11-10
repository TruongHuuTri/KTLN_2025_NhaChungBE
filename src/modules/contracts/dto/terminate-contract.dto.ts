import { IsOptional, IsString, IsDateString } from 'class-validator';

export class TerminateContractDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  terminationDate?: string;
}

