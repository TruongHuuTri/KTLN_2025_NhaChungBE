import { IsString, IsEnum } from 'class-validator';

export class PayInvoiceDto {
  @IsEnum(['cash', 'bank_transfer', 'momo', 'zalopay'])
  paymentMethod: string;
}
