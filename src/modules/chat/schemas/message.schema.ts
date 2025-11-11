import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

export type MessageType = 'text' | 'image' | 'video' | 'file' | 'system';

@Schema({ _id: false })
export class MessageMetadata {
  @Prop()
  postId?: number;

  @Prop()
  postType?: string; // 'cho-thue' | 'tim-o-ghep'

  @Prop()
  roomId?: number;

  @Prop()
  postTitle?: string;

  @Prop()
  postPrice?: number;

  @Prop()
  postAddress?: string;

  @Prop()
  postImage?: string;

  @Prop()
  postUrl?: string;

  @Prop()
  roomName?: string;
}

@Schema({ timestamps: true, collection: 'messages' })
export class Message {
  @Prop({ required: true, unique: true })
  messageId: number; // Auto-increment, dùng Date.now()

  @Prop({ required: true })
  conversationId: number; // ID của conversation

  @Prop()
  senderId?: number; // userId của người gửi (null cho system message)

  @Prop({ required: true, enum: ['text', 'image', 'video', 'file', 'system'], default: 'text' })
  type: MessageType;

  @Prop({ required: true, minlength: 1 })
  // maxlength được validate trong service:
  // - Text: max 5000 ký tự
  // - Image/Video/File: không giới hạn (base64 hoặc URL)
  content: string; // Nội dung tin nhắn (text hoặc URL nếu là image/video/file)

  @Prop({ type: MessageMetadata })
  metadata?: MessageMetadata; // Metadata cho system message (postId, postTitle, etc.)

  @Prop({ default: false })
  isRead: boolean; // Đã đọc chưa

  @Prop()
  readAt?: Date; // Thời gian đọc

  @Prop({ default: false })
  isDeleted: boolean; // Soft delete

  @Prop()
  deletedAt?: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes
MessageSchema.index({ messageId: 1 }, { unique: true });
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ conversationId: 1, isRead: 1 });

