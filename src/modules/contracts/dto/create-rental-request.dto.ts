import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateRentalRequestDto {
  @IsNumber()
  landlordId: number;

  @IsNumber()
  roomId: number;

  @IsOptional()
  @IsNumber()
  postId?: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsDateString()
  requestedMoveInDate: string;

  @IsNumber()
  requestedDuration: number;
}
