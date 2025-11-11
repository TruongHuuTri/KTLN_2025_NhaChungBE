import { IsNotEmpty, IsNumber } from 'class-validator';

export class MarkReadDto {
  @IsNotEmpty()
  @IsNumber()
  conversationId: number;

  @IsNotEmpty()
  @IsNumber()
  userId: number;
}

