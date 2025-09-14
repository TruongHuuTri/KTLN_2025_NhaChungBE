import { IsString, IsNumber, IsArray, IsOptional, ValidateNested, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class TenantDto {
  @IsNumber()
  tenantId: number;

  @IsDateString()
  moveInDate: string;

  @IsNumber()
  monthlyRent: number;

  @IsNumber()
  deposit: number;

  @IsOptional()
  @IsEnum(['active', 'left', 'terminated'])
  status?: string;

  @IsOptional()
  @IsDateString()
  leftDate?: string;
}

export class RoomInfoDto {
  @IsString()
  roomNumber: string;

  @IsNumber()
  area: number;

  @IsNumber()
  maxOccupancy: number;

  @IsNumber()
  currentOccupancy: number;
}

export class CreateContractDto {
  @IsNumber()
  roomId: number;

  @IsEnum(['single', 'shared'])
  contractType: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  monthlyRent: number;

  @IsNumber()
  deposit: number;

  @IsOptional()
  @IsString()
  contractFile?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TenantDto)
  tenants: TenantDto[];

  @ValidateNested()
  @Type(() => RoomInfoDto)
  roomInfo: RoomInfoDto;
}
