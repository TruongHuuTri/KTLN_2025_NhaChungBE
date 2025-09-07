import { IsNotEmpty, IsString, IsNumber, IsArray, IsOptional, IsBoolean, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class NhaNguyenCanAddressDto {
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

export class NhaNguyenCanPropertyInfoDto {
  @IsOptional()
  @IsString({ message: 'Tên khu/lô phải là chuỗi' })
  khuLo?: string;

  @IsOptional()
  @IsString({ message: 'Mã căn phải là chuỗi' })
  unitCode?: string;

  @IsOptional()
  @IsString({ message: 'Loại hình phải là chuỗi' })
  @IsIn(['nha-pho', 'biet-thu', 'nha-hem', 'nha-cap4'], { message: 'Loại hình không hợp lệ' })
  propertyType?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Tổng số tầng phải là số' })
  totalFloors?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Diện tích đất phải là số' })
  landArea?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Diện tích sử dụng phải là số' })
  usableArea?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Chiều ngang phải là số' })
  width?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Chiều dài phải là số' })
  length?: number;

  @IsOptional()
  @IsArray({ message: 'Đặc điểm phải là mảng' })
  @IsString({ each: true, message: 'Mỗi đặc điểm phải là chuỗi' })
  features?: string[];
}

export class CreateNhaNguyenCanDto {
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
  @Type(() => NhaNguyenCanAddressDto)
  address: NhaNguyenCanAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NhaNguyenCanPropertyInfoDto)
  propertyInfo?: NhaNguyenCanPropertyInfoDto;

  @IsNotEmpty({ message: 'Diện tích đất không được để trống' })
  @IsNumber({}, { message: 'Diện tích đất phải là số' })
  landArea: number;

  @IsOptional()
  @IsNumber({}, { message: 'Diện tích sử dụng phải là số' })
  usableArea?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Chiều ngang phải là số' })
  width?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Chiều dài phải là số' })
  length?: number;

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
  @IsNumber({}, { message: 'Số phòng ngủ phải là số' })
  bedrooms?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Số phòng vệ sinh phải là số' })
  bathrooms?: number;

  @IsOptional()
  @IsString({ message: 'Hướng phải là chuỗi' })
  direction?: string;

  @IsOptional()
  @IsString({ message: 'Tình trạng sổ phải là chuỗi' })
  @IsIn(['co-so-hong', 'cho-so'], { message: 'Tình trạng sổ không hợp lệ' })
  legalStatus?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'], { message: 'Trạng thái không hợp lệ' })
  status?: string;
}
