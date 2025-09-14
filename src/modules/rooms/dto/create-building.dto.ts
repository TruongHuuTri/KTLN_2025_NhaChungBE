import { IsString, IsNumber, IsArray, IsOptional, ValidateNested, IsBoolean, IsEnum } from 'class-validator';
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

export class CreateBuildingDto {
  @IsString()
  name: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @IsNumber()
  totalFloors: number;

  @IsNumber()
  totalRooms: number;

  @IsEnum(['chung-cu', 'nha-nguyen-can', 'phong-tro'])
  buildingType: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  description?: string;
}
