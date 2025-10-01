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
  status: string; // 'pending', 'approved', 'rejected', 'cancelled', 'pending_user_approval', 'pending_landlord_approval'

  @Prop({ default: '' })
  message: string;

  @Prop({ default: 'rental' })
  requestType: string; // 'rental', 'room_sharing'

  @Prop()
  posterId?: number; // ID của người đăng bài (cho room sharing)

  @Prop({ required: true })
  requestedMoveInDate: Date;

  @Prop({ required: true })
  requestedDuration: number;

  @Prop({ default: '' })
  landlordResponse: string;

  @Prop()
  respondedAt?: Date;

  @Prop()
  contractId?: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const RentalRequestSchema = SchemaFactory.createForClass(RentalRequest);
