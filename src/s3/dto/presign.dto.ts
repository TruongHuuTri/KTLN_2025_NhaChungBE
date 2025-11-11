import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export enum UploadFolder {
  images = 'images',
  videos = 'videos',
  verifications = 'verifications',
  documents = 'documents', // Business licenses, contracts, etc.
  chat = 'chat', // Chat messages (images, videos, files)
}

export class PresignDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  userId!: number;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @IsEnum(UploadFolder)
  folder!: UploadFolder;
}
