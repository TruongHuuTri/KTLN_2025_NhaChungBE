import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @IsNotEmpty()
  @IsNumber()
  tenantId: number;

  @IsNotEmpty()
  @IsNumber()
  landlordId: number;

  @IsOptional()
  @IsNumber()
  postId?: number;

  @IsOptional()
  @IsNumber()
  roomId?: number;
}

