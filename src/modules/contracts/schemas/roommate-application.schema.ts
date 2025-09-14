import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoommateApplicationDocument = RoommateApplication & Document;

@Schema({ timestamps: true, collection: 'roommate-applications' })
export class RoommateApplication {
  @Prop({ required: true, unique: true })
  applicationId: number;

  @Prop({ required: true })
  postId: number;

  @Prop({ required: true })
  applicantId: number;

  @Prop({ required: true })
  posterId: number;

  @Prop({ required: true })
  roomId: number;

  @Prop({ default: 'pending' })
  status: string; // 'pending', 'approved', 'rejected', 'cancelled'

  @Prop({ default: '' })
  message: string;

  @Prop({ required: true })
  appliedAt: Date;

  @Prop()
  respondedAt?: Date;

  @Prop({ default: '' })
  responseMessage: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const RoommateApplicationSchema = SchemaFactory.createForClass(RoommateApplication);
