import { IsString, IsNotEmpty } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}
