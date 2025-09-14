import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RentalRequestDocument = RentalRequest & Document;

@Schema({ timestamps: true, collection: 'rental-requests' })
export class RentalRequest {
  @Prop({ required: true, unique: true })
  requestId: number;

  @Prop({ required: true })
  tenantId: number;

  @Prop({ required: true })
  landlordId: number;

  @Prop({ required: true })
  roomId: number;

  @Prop()
  postId?: number;

  @Prop({ default: 'pending' })
  status: string; // 'pending', 'approved', 'rejected', 'cancelled'

  @Prop({ default: '' })
  message: string;

  @Prop({ required: true })
  requestedMoveInDate: Date;

  @Prop({ required: true })
  requestedDuration: number;

  @Prop({ default: '' })
  landlordResponse: string;

  @Prop()
  respondedAt?: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const RentalRequestSchema = SchemaFactory.createForClass(RentalRequest);
