import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RentalHistoryDocument = RentalHistory & Document;

@Schema({ timestamps: true, collection: 'rental-histories' })
export class RentalHistory {
  @Prop({ required: true, index: true })
  userId: number;

  @Prop({ required: true })
  contractId: number;

  @Prop({ required: true })
  roomId: number;

  @Prop({ required: true })
  buildingId: number;

  @Prop({ required: true })
  landlordId: number;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop()
  actualEndDate: Date;

  @Prop({ required: true })
  monthlyRent: number;

  @Prop({ required: true })
  deposit: number;

  @Prop({ required: true, enum: ['expired', 'terminated'], index: true })
  contractStatus: string;

  @Prop()
  terminationReason?: string;

  @Prop()
  terminatedAt?: Date;

  @Prop()
  totalMonthsRented?: number;

  @Prop()
  totalAmountPaid?: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const RentalHistorySchema = SchemaFactory.createForClass(RentalHistory);

// Create compound indexes
RentalHistorySchema.index({ userId: 1, actualEndDate: -1 });
RentalHistorySchema.index({ contractStatus: 1 });

