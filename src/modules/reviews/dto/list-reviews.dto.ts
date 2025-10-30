import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class ListReviewsQueryDto {
  @IsEnum(['USER', 'ROOM', 'BUILDING', 'POST'] as const)
  targetType: 'USER' | 'ROOM' | 'BUILDING' | 'POST';

  @IsInt()
  targetId: number;

  @IsOptional()
  @IsInt()
  rating?: number;

  @IsOptional()
  @IsString()
  sort?: 'recent' | 'top';

  @IsOptional()
  @IsString()
  hasMedia?: 'true' | 'false';

  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  pageSize?: number;
}

