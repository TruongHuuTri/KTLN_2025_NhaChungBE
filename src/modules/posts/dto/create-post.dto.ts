import { 
  IsString, 
  IsNumber, 
  IsArray, 
  IsOptional, 
  ValidateNested, 
  IsBoolean, 
  IsEnum,
  IsEmail,
  IsPhoneNumber
} from 'class-validator';
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

export class BasicInfoDto {
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

export class RoomInfoDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BasicInfoDto)
  basicInfo?: BasicInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChungCuInfoDto)
  chungCuInfo?: ChungCuInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NhaNguyenCanInfoDto)
  nhaNguyenCanInfo?: NhaNguyenCanInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UtilitiesDto)
  utilities?: UtilitiesDto;
}

export class PersonalInfoDto {
  @IsString()
  fullName: string;

  @IsNumber()
  age: number;

  @IsString()
  gender: string;

  @IsString()
  occupation: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hobbies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  habits?: string[];

  @IsEnum(['early', 'normal', 'late'])
  lifestyle: string;

  @IsEnum(['very_clean', 'clean', 'normal', 'flexible'])
  cleanliness: string;
}

export class RequirementsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  ageRange: number[];

  @IsString()
  gender: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  traits?: string[];

  @IsNumber()
  maxPrice: number;
}

export class CreatePostDto {
  @IsEnum(['cho-thue', 'tim-o-ghep'])
  postType: 'cho-thue' | 'tim-o-ghep';

  @IsOptional()
  @IsEnum(['chung-cu', 'phong-tro', 'nha-nguyen-can', 'o-ghep'])
  category?: 'chung-cu' | 'phong-tro' | 'nha-nguyen-can' | 'o-ghep';

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videos?: string[];

  @IsNumber()
  roomId: number;


  @IsOptional()
  @ValidateNested()
  @Type(() => PersonalInfoDto)
  personalInfo?: PersonalInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RequirementsDto)
  requirements?: RequirementsDto;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  // Service-managed fields
  @IsOptional()
  @IsBoolean()
  isManaged?: boolean;

  @IsOptional()
  @IsNumber()
  buildingId?: number;

  @IsOptional()
  @IsNumber()
  landlordId?: number;

  @IsOptional()
  @IsString()
  source?: string;
}
