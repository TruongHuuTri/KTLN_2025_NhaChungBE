import { IsNumber, IsPositive } from 'class-validator';

export class GeneratePaymentQRDto {
  @IsNumber()
  @IsPositive()
  invoiceId: number;
}
