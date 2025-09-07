import { IsNotEmpty, IsString, IsNumber, IsArray, IsOptional, IsBoolean, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PhongTroAddressDto {
  @IsNotEmpty({ message: 'Đường không được để trống' })
  @IsString({ message: 'Đường phải là chuỗi' })
  street: string;

  @IsNotEmpty({ message: 'Phường không được để trống' })
  @IsString({ message: 'Phường phải là chuỗi' })
  ward: string;

  @IsNotEmpty({ message: 'Quận không được để trống' })
  @IsString({ message: 'Quận phải là chuỗi' })
  district: string;

  @IsNotEmpty({ message: 'Thành phố không được để trống' })
  @IsString({ message: 'Thành phố phải là chuỗi' })
  city: string;

  @IsOptional()
  @IsString({ message: 'Số nhà phải là chuỗi' })
  houseNumber?: string;

  @IsOptional()
  @IsBoolean({ message: 'Hiển thị số nhà phải là boolean' })
  showHouseNumber?: boolean;
}

export class CreatePhongTroDto {
  @IsNotEmpty({ message: 'User ID không được để trống' })
  @IsString({ message: 'User ID phải là chuỗi' })
  userId: string;

  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString({ message: 'Tiêu đề phải là chuỗi' })
  title: string;

  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  @IsString({ message: 'Mô tả phải là chuỗi' })
  description: string;

  @IsOptional()
  @IsArray({ message: 'Hình ảnh phải là mảng' })
  @IsString({ each: true, message: 'Mỗi hình ảnh phải là chuỗi' })
  images?: string[];

  @IsOptional()
  @IsArray({ message: 'Video phải là mảng' })
  @IsString({ each: true, message: 'Mỗi video phải là chuỗi' })
  videos?: string[];

  @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
  @ValidateNested()
  @Type(() => PhongTroAddressDto)
  address: PhongTroAddressDto;

  @IsNotEmpty({ message: 'Diện tích không được để trống' })
  @IsNumber({}, { message: 'Diện tích phải là số' })
  area: number;

  @IsNotEmpty({ message: 'Giá thuê không được để trống' })
  @IsNumber({}, { message: 'Giá thuê phải là số' })
  price: number;

  @IsOptional()
  @IsNumber({}, { message: 'Số tiền cọc phải là số' })
  deposit?: number;

  @IsOptional()
  @IsString({ message: 'Tình trạng nội thất phải là chuỗi' })
  furniture?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'], { message: 'Trạng thái không hợp lệ' })
  status?: string;
}
