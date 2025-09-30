import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentOrderDocument = PaymentOrder & Document;

@Schema({ timestamps: true, collection: 'payment-orders' })
export class PaymentOrder {
  @Prop({ required: true, unique: true })
  orderId: string;

  @Prop({ required: true })
  invoiceId: number;

  @Prop({ required: true })
  tenantId: number;

  @Prop({ required: true })
  landlordId: number;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  orderType: string; // 'initial_payment', 'monthly_rent', 'deposit', 'utilities'

  @Prop({ default: 'pending' })
  status: string; // 'pending', 'paid', 'expired', 'cancelled'

  @Prop()
  qrCodeUrl?: string;

  @Prop()
  qrCodeData?: string;

  @Prop()
  paymentMethod?: string;

  @Prop()
  paidAt?: Date;

  @Prop()
  expiryAt?: Date;

  @Prop({ default: false })
  isQrGenerated: boolean;

  @Prop({ default: null })
  zalopayOrderId?: string;

  @Prop({ default: null })
  zalopayTransactionId?: string;

  @Prop({ default: null })
  zalopayPaymentUrl?: string;

  @Prop({ default: null })
  zalopayStatus?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const PaymentOrderSchema = SchemaFactory.createForClass(PaymentOrder);
