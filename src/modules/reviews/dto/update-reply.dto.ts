import { IsString, IsNumber, MinLength, MaxLength, IsArray, IsOptional, ArrayMaxSize } from 'class-validator';

export class UpdateReplyDto {
  @IsNumber()
  userId: number;

  @IsString()
  @MinLength(1, { message: 'Reply phải có ít nhất 1 ký tự' })
  @MaxLength(500, { message: 'Reply không được vượt quá 500 ký tự' })
  content: string;

  @IsOptional()
  @IsArray({ message: 'Media phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi URL media phải là string' })
  @ArrayMaxSize(3, { message: 'Reply chỉ được đính kèm tối đa 3 ảnh' })
  media?: string[];
}

