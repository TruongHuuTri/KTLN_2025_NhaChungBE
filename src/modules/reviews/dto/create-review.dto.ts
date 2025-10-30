import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  writerId: number; // optional nếu lấy từ JWT, nhưng để linh hoạt theo style hiện tại

  @IsEnum(['USER', 'ROOM', 'BUILDING', 'POST'] as const)
  targetType: 'USER' | 'ROOM' | 'BUILDING' | 'POST';

  @IsInt()
  targetId: number;

  @IsOptional()
  @IsInt()
  contractId?: number;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @IsOptional()
  media?: string[];

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

