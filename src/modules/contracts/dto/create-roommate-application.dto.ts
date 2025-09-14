import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateRoommateApplicationDto {
  @IsNumber()
  postId: number;

  @IsNumber()
  posterId: number;

  @IsNumber()
  roomId: number;

  @IsOptional()
  @IsString()
  message?: string;
}
