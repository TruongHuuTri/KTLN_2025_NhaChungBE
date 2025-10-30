import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReviewDocument = Review & Document;

export type ReviewTargetType = 'USER' | 'ROOM' | 'BUILDING' | 'POST';

@Schema({ _id: false })
export class ReviewVote {
  @Prop({ required: true })
  userId: number;

  @Prop({ required: true })
  isHelpful: boolean;
}

@Schema({ timestamps: true, collection: 'reviews' })
export class Review {
  @Prop({ required: true, unique: true })
  reviewId: number; // dùng Date.now() để sinh nhanh số nguyên duy nhất

  @Prop({ required: true })
  writerId: number;

  @Prop({ type: String, enum: ['USER', 'ROOM', 'BUILDING', 'POST'], required: true })
  targetType: ReviewTargetType;

  @Prop({ required: true })
  targetId: number;

  @Prop()
  contractId?: number; // bắt buộc khi áp dụng eligibility theo hợp đồng

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true, minlength: 1, maxlength: 2000 })
  content: string;

  @Prop({ type: [String], default: [] })
  media: string[];

  @Prop({ default: false })
  isAnonymous: boolean;

  @Prop({ default: false })
  isEdited: boolean;

  @Prop({ default: 0 })
  votesHelpful: number;

  @Prop({ default: 0 })
  votesUnhelpful: number;

  @Prop({ type: [ReviewVote], default: [] })
  votes: ReviewVote[]; // lưu lịch sử vote theo user để chống vote trùng

  @Prop()
  deletedAt?: Date; // soft delete

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Index phục vụ list và ràng buộc 1 review/contract/target
ReviewSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
ReviewSchema.index({ writerId: 1, contractId: 1 }, { unique: false });
ReviewSchema.index({ contractId: 1 });
ReviewSchema.index({ reviewId: 1 }, { unique: true });

