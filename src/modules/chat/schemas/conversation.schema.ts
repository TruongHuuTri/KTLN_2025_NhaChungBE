import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true, collection: 'conversations' })
export class Conversation {
  @Prop({ required: true, unique: true })
  conversationId: number; // Auto-increment, dùng Date.now()

  @Prop({ required: true })
  tenantId: number; // userId của người thuê

  @Prop({ required: true })
  landlordId: number; // userId của chủ nhà

  @Prop()
  postId?: number; // ID của post liên quan (optional)

  @Prop()
  roomId?: number; // ID của room liên quan (optional)

  @Prop({ default: Date.now })
  lastMessageAt: Date; // Thời gian tin nhắn cuối cùng

  @Prop({ default: 0 })
  unreadCountTenant: number; // Số tin nhắn chưa đọc của tenant

  @Prop({ default: 0 })
  unreadCountLandlord: number; // Số tin nhắn chưa đọc của landlord

  @Prop({ default: true })
  isActive: boolean; // Cuộc trò chuyện còn hoạt động

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Indexes
ConversationSchema.index({ conversationId: 1 }, { unique: true });
ConversationSchema.index({ tenantId: 1, landlordId: 1 });
ConversationSchema.index({ tenantId: 1, lastMessageAt: -1 });
ConversationSchema.index({ landlordId: 1, lastMessageAt: -1 });
ConversationSchema.index({ postId: 1 });
ConversationSchema.index({ roomId: 1 });

