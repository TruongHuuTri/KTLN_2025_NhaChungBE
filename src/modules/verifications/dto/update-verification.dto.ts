import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class UpdateVerificationDto {
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  @IsIn(['approved', 'rejected'], { message: 'Trạng thái phải là approved hoặc rejected' })
  status: string;

  @IsOptional()
  @IsString({ message: 'Ghi chú admin phải là chuỗi' })
  adminNote?: string;
}
