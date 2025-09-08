import { IsNotEmpty, IsString, IsNumber, IsArray, IsOptional, IsIn, ValidateNested, IsNumberString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { RENT_POST_STATUSES } from '../schemas/rent-post.schema';

export class CreateAddressDto {
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

export class CreateBasicInfoDto {
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
  legalStatus?: string;
}

export class CreateChungCuInfoDto {
  @IsOptional()
  @IsString({ message: 'Tên tòa nhà phải là chuỗi' })
  buildingName?: string;

  @IsOptional()
  @IsString({ message: 'Block/Tháp phải là chuỗi' })
  blockOrTower?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Tầng số phải là số' })
  floorNumber?: number;

  @IsOptional()
  @IsString({ message: 'Mã căn phải là chuỗi' })
  unitCode?: string;

  @IsOptional()
  @IsString({ message: 'Loại hình phải là chuỗi' })
  propertyType?: string;
}

export class CreateNhaNguyenCanInfoDto {
  @IsOptional()
  @IsString({ message: 'Tên khu/lô phải là chuỗi' })
  khuLo?: string;

  @IsOptional()
  @IsString({ message: 'Mã căn phải là chuỗi' })
  unitCode?: string;

  @IsOptional()
  @IsString({ message: 'Loại hình phải là chuỗi' })
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

export class CreateRentPostDto {
  @IsNotEmpty({ message: 'User ID không được để trống' })
  @IsNumberString({}, { message: 'User ID phải là số' })
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
  @Type(() => CreateAddressDto)
  address: CreateAddressDto;

  @IsNotEmpty({ message: 'Loại nhà không được để trống' })
  @IsIn(['phong-tro', 'chung-cu', 'nha-nguyen-can'], { message: 'Loại nhà không hợp lệ' })
  category: string;

  @IsNotEmpty({ message: 'Thông tin cơ bản không được để trống' })
  @ValidateNested()
  @Type(() => CreateBasicInfoDto)
  basicInfo: CreateBasicInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateChungCuInfoDto)
  chungCuInfo?: CreateChungCuInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateNhaNguyenCanInfoDto)
  nhaNguyenCanInfo?: CreateNhaNguyenCanInfoDto;

  @IsOptional()
  @IsIn(RENT_POST_STATUSES as any, { message: 'Trạng thái không hợp lệ' })
  status?: string; // hoặc RentPostStatus
}
