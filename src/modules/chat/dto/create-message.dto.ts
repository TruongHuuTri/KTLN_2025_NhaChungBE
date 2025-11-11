import { IsNotEmpty, IsString, IsEnum, IsOptional, IsNumber, MinLength, MaxLength } from 'class-validator';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  FILE = 'file',
}

export class CreateMessageDto {
  @IsNotEmpty()
  @IsNumber()
  conversationId: number;

  @IsOptional()
  @IsNumber()
  senderId?: number; // Optional cho system message

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  // MaxLength được validate động trong service:
  // - Text: max 5000 ký tự
  // - Image/Video/File: không giới hạn (base64 có thể rất dài)
  content: string;
}

