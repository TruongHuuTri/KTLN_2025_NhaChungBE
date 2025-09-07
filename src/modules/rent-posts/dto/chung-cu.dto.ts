import { IsNotEmpty, IsString, IsNumber, IsArray, IsOptional, IsBoolean, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChungCuAddressDto {
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

export class ChungCuBuildingInfoDto {
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
}

export class CreateChungCuDto {
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
  @Type(() => ChungCuAddressDto)
  address: ChungCuAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChungCuBuildingInfoDto)
  buildingInfo?: ChungCuBuildingInfoDto;

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
  @IsString({ message: 'Loại hình phải là chuỗi' })
  @IsIn(['chung-cu', 'can-ho-dv', 'officetel', 'studio'], { message: 'Loại hình không hợp lệ' })
  propertyType?: string;

  @IsOptional()
  @IsString({ message: 'Tình trạng sổ phải là chuỗi' })
  @IsIn(['co-so-hong', 'cho-so'], { message: 'Tình trạng sổ không hợp lệ' })
  legalStatus?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'], { message: 'Trạng thái không hợp lệ' })
  status?: string;
}
