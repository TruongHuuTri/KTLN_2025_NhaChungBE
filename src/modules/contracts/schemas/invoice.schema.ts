import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true, collection: 'invoices' })
export class Invoice {
  @Prop({ required: true, unique: true })
  invoiceId: number;

  @Prop({ required: true })
  tenantId: number;

  @Prop({ required: true })
  landlordId: number;

  @Prop({ required: true })
  roomId: number;

  @Prop({ required: true })
  contractId: number;

  @Prop({ required: true })
  invoiceType: string; // 'rent', 'deposit', 'utilities', 'penalty'

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  dueDate: Date;

  @Prop()
  paidDate?: Date;

  @Prop({ default: 'pending' })
  status: string; // 'pending', 'paid', 'overdue', 'cancelled'

  @Prop()
  paymentMethod?: string; // 'cash', 'bank_transfer', 'momo', 'zalopay'

  @Prop({ default: '' })
  description: string;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ type: [Object], default: [] })
  items: Array<{
    description: string;
    amount: number;
    type: string;
  }>;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
