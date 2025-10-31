import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ManualOtherItemDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  type?: string;
}

export class CreateManualInvoiceDto {
  @IsNumber()
  contractId: number;

  @IsInt()
  @Min(1)
  month: number; // 1-12

  @IsInt()
  @Min(1970)
  year: number;

  @IsOptional()
  @IsString()
  dueDate?: string; // ISO

  @IsOptional()
  @IsNumber()
  @Min(0)
  electricityStart?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  electricityEnd?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  electricityUnitPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  waterStart?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  waterEnd?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  waterUnitPrice?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualOtherItemDto)
  otherItems?: ManualOtherItemDto[];

  @IsOptional()
  @IsBoolean()
  includeRent?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rentAmountOverride?: number;

  @IsOptional()
  @IsString()
  note?: string;
}


