import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmailVerificationDocument = EmailVerification & Document;

@Schema({ timestamps: true })
export class EmailVerification {
  @Prop({ required: true, unique: true })
  verificationId: number;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  otp: string;

  @Prop({ required: true, default: 'registration' })
  type: string; // 'registration' | 'role_upgrade'

  @Prop({ required: false })
  userId?: number;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ required: true, default: false })
  isUsed: boolean;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;

  @Prop({ required: true, default: Date.now })
  updatedAt: Date;
}

export const EmailVerificationSchema = SchemaFactory.createForClass(EmailVerification);

// Index để tự động xóa OTP hết hạn
EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
