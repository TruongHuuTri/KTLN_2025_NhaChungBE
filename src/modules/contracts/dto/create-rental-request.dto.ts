import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateRentalRequestDto {
  @IsNumber()
  postId: number;

  @IsDateString()
  requestedMoveInDate: string;

  @IsNumber()
  requestedDuration: number;

  @IsOptional()
  @IsString()
  message?: string;
}
