import { IsString, IsDateString, IsNumber, IsOptional, MinLength } from 'class-validator';

export class CreateRoomSharingRequestDto {
  @IsNumber()
  postId: number;

  @IsString()
  @MinLength(1, { message: 'Message cannot be empty' })
  message: string;

  @IsDateString()
  requestedMoveInDate: string;

  @IsNumber()
  requestedDuration: number;
}