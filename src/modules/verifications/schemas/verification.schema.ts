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

  // Ảnh CCCD và selfie (lưu S3 URLs)
  @Prop({
    type: {
      frontImage: { type: String }, // S3 URL
      backImage: { type: String },  // S3 URL
      faceImage: { type: String }   // S3 URL
    }
  })
  images?: {
    frontImage: string;
    backImage: string;
    faceImage: string;
  };

  // Ghi chú từ admin
  @Prop()
  adminNote?: string;

  // Kết quả FaceMatch từ AI
  @Prop({
    type: {
      match: { type: Boolean },
      similarity: { type: Number },
      confidence: { type: String, enum: ['high', 'low'] }
    }
  })
  faceMatchResult?: {
    match: boolean;
    similarity: number;
    confidence: 'high' | 'low';
  };

  // Giấy phép kinh doanh (chỉ cho chủ nhà)
  @Prop()
  businessLicense?: string; // S3 URL

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const VerificationSchema = SchemaFactory.createForClass(Verification);
