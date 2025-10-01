import { IsString, IsOptional } from 'class-validator';

export class ApproveRoomSharingDto {
  @IsOptional()
  @IsString()
  responseMessage?: string;
}
