import { IsString, IsNumber, IsArray, IsOptional, ValidateNested, IsBoolean, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class AddressDto {
  @IsString()
  street: string;

  @IsString()
  ward: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  specificAddress?: string;

  @IsOptional()
  @IsBoolean()
  showSpecificAddress?: boolean;

  @IsString()
  provinceCode: string;

  @IsString()
  provinceName: string;

  @IsString()
  wardCode: string;

  @IsString()
  wardName: string;

  @IsOptional()
  @IsString()
  additionalInfo?: string;
}

export class ChungCuInfoDto {
  @IsOptional()
  @IsString()
  buildingName?: string;

  @IsOptional()
  @IsString()
  blockOrTower?: string;

  @IsOptional()
  @IsNumber()
  floorNumber?: number;

  @IsOptional()
  @IsString()
  unitCode?: string;

  @IsOptional()
  @IsString()
  propertyType?: string; // 'chung-cu', 'can-ho-dv', 'officetel', 'studio'

  @IsOptional()
  @IsNumber()
  bedrooms?: number;

  @IsOptional()
  @IsNumber()
  bathrooms?: number;

  @IsOptional()
  @IsString()
  direction?: string; // 'dong', 'tay', 'nam', 'bac', 'dong-nam', 'dong-bac', 'tay-nam', 'tay-bac'

  @IsOptional()
  @IsString()
  furniture?: string; // 'full', 'co-ban', 'trong'

  @IsOptional()
  @IsString()
  legalStatus?: string; // 'co-so-hong', 'cho-so'
}

export class NhaNguyenCanInfoDto {
  @IsOptional()
  @IsString()
  khuLo?: string;

  @IsOptional()
  @IsString()
  unitCode?: string;

  @IsOptional()
  @IsString()
  propertyType?: string; // 'nha-pho', 'biet-thu', 'nha-hem', 'nha-cap4'

  @IsOptional()
  @IsNumber()
  bedrooms?: number;

  @IsOptional()
  @IsNumber()
  bathrooms?: number;

  @IsOptional()
  @IsString()
  direction?: string; // 'dong', 'tay', 'nam', 'bac', 'dong-nam', 'dong-bac', 'tay-nam', 'tay-bac'

  @IsOptional()
  @IsNumber()
  totalFloors?: number;

  @IsOptional()
  @IsString()
  legalStatus?: string; // 'co-so-hong', 'cho-so'

  @IsOptional()
  @IsString()
  furniture?: string; // 'full', 'co-ban', 'trong'

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[]; // 'Hẻm xe hơi', 'Nhà nở hậu', 'Nhà tóp hậu', etc.

  @IsOptional()
  @IsNumber()
  landArea?: number; // Diện tích đất (m²)

  @IsOptional()
  @IsNumber()
  usableArea?: number; // Diện tích sử dụng (m²)

  @IsOptional()
  @IsNumber()
  width?: number; // Chiều ngang (m)

  @IsOptional()
  @IsNumber()
  length?: number; // Chiều dài (m)
}

export class IncludedInRentDto {
  @IsOptional()
  @IsBoolean()
  electricity?: boolean;

  @IsOptional()
  @IsBoolean()
  water?: boolean;

  @IsOptional()
  @IsBoolean()
  internet?: boolean;

  @IsOptional()
  @IsBoolean()
  garbage?: boolean;

  @IsOptional()
  @IsBoolean()
  cleaning?: boolean;

  @IsOptional()
  @IsBoolean()
  parkingMotorbike?: boolean;

  @IsOptional()
  @IsBoolean()
  parkingCar?: boolean;

  @IsOptional()
  @IsBoolean()
  managementFee?: boolean;
}

export class UtilitiesDto {
  @IsOptional()
  @IsNumber()
  electricityPricePerKwh?: number;

  @IsOptional()
  @IsNumber()
  waterPrice?: number;

  @IsOptional()
  @IsString()
  waterBillingType?: string;

  @IsOptional()
  @IsNumber()
  internetFee?: number;

  @IsOptional()
  @IsNumber()
  garbageFee?: number;

  @IsOptional()
  @IsNumber()
  cleaningFee?: number;

  @IsOptional()
  @IsNumber()
  parkingMotorbikeFee?: number;

  @IsOptional()
  @IsNumber()
  parkingCarFee?: number;

  @IsOptional()
  @IsNumber()
  managementFee?: number;

  @IsOptional()
  @IsString()
  managementFeeUnit?: string;

  @IsOptional()
  @IsNumber()
  gardeningFee?: number;

  @IsOptional()
  @IsNumber()
  cookingGasFee?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => IncludedInRentDto)
  includedInRent?: IncludedInRentDto;
}

export class CurrentTenantDto {
  @IsNumber()
  userId: number;

  @IsString()
  fullName: string;

  @IsDateString()
  dateOfBirth: string;

  @IsString()
  gender: string;

  @IsString()
  occupation: string;

  @IsString()
  moveInDate: string;

  @IsEnum(['early', 'normal', 'late'])
  lifestyle: string;

  @IsEnum(['very_clean', 'clean', 'normal', 'flexible'])
  cleanliness: string;
}

export class CreateRoomDto {
  @IsNumber()
  buildingId: number;

  @IsString()
  roomNumber: string;

  @IsNumber()
  floor: number;

  // category sẽ được lấy từ buildingType của building

  // BasicInfo
  @IsNumber()
  area: number;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsNumber()
  deposit?: number;

  @IsOptional()
  @IsString()
  furniture?: string;

  @IsOptional()
  @IsNumber()
  bedrooms?: number;

  @IsOptional()
  @IsNumber()
  bathrooms?: number;

  @IsOptional()
  @IsString()
  direction?: string;

  @IsOptional()
  @IsString()
  legalStatus?: string;

  // Thông tin riêng theo loại
  @IsOptional()
  @ValidateNested()
  @Type(() => ChungCuInfoDto)
  chungCuInfo?: ChungCuInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NhaNguyenCanInfoDto)
  nhaNguyenCanInfo?: NhaNguyenCanInfoDto;

  // Utilities
  @IsOptional()
  @ValidateNested()
  @Type(() => UtilitiesDto)
  utilities?: UtilitiesDto;

  // Address
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  // Thông tin cho ở ghép
  @IsNumber()
  maxOccupancy: number;

  @IsBoolean()
  canShare: boolean;

  @IsOptional()
  @IsNumber()
  sharePrice?: number;

  @IsOptional()
  @IsNumber()
  currentOccupants?: number;

  @IsOptional()
  @IsNumber()
  availableSpots?: number;

  @IsOptional()
  @IsString()
  shareMethod?: string;

  @IsOptional()
  @IsNumber()
  estimatedMonthlyUtilities?: number;

  @IsOptional()
  @IsNumber()
  capIncludedAmount?: number;

  // Thông tin người ở hiện tại
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurrentTenantDto)
  currentTenants?: CurrentTenantDto[];

  // Media & mô tả
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videos?: string[];

  @IsOptional()
  @IsString()
  description?: string;
}
