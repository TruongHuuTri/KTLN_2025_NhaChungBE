import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VerificationDocument = Verification & Document;


@Schema({ timestamps: true, collection: 'verifications' })
export class Verification {
  @Prop({ required: true, unique: true })
  verificationId: number;

  @Prop({ required: true })
  userId: number;

  @Prop({ 
    required: true, 
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  })
  status: string;

  @Prop({ required: true, default: Date.now })
  submittedAt: Date;

  @Prop()
  reviewedAt?: Date;

  @Prop()
  reviewedBy?: number; // adminId từ admin token

  // Thông tin CMND/CCCD
  @Prop({ required: true })
  idNumber: string;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  dateOfBirth: Date;

  @Prop({ 
    required: true, 
    enum: ['male', 'female'] 
  })
  gender: string;

  @Prop({ required: true })
  issueDate: Date;

  @Prop({ required: true })
  issuePlace: string;

  // Không lưu ảnh CCCD vào database (chỉ dùng để OCR client-side)
  // frontImage và backImage chỉ xử lý client-side

  // Ghi chú từ admin
  @Prop()
  adminNote?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const VerificationSchema = SchemaFactory.createForClass(Verification);
