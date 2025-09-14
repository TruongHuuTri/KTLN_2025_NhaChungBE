import { IsString, IsNumber, IsOptional, IsDateString, IsEnum, IsArray } from 'class-validator';

export class CreateInvoiceDto {
  @IsNumber()
  tenantId: number;

  @IsNumber()
  roomId: number;

  @IsNumber()
  contractId: number;

  @IsEnum(['rent', 'deposit', 'utilities', 'penalty'])
  invoiceType: string;

  @IsNumber()
  amount: number;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
