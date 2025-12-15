import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TerminationRequestDocument = TerminationRequest & Document;

@Schema({ timestamps: true })
export class TerminationRequest {
  @Prop({ required: true, unique: true })
  requestId: number;

  @Prop({ required: true, index: true })
  contractId: number;

  @Prop({ required: true, index: true })
  tenantId: number; // Người thuê yêu cầu huỷ

  @Prop({ required: true, index: true })
  landlordId: number; // Chủ nhà cần duyệt

  @Prop()
  reason?: string; // Lý do huỷ

  @Prop({ required: true })
  requestedTerminationDate: Date; // Ngày muốn kết thúc hợp đồng

  @Prop({ required: true, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true })
  status: string;

  @Prop()
  landlordResponse?: string; // Phản hồi của chủ

  @Prop()
  respondedAt?: Date; // Thời điểm chủ phản hồi

  // Thông tin về tiền cọc
  @Prop({ required: true, default: false })
  isEarlyTermination: boolean; // Huỷ trước hạn?

  @Prop({ required: true, default: false })
  willLoseDeposit: boolean; // Có bị mất cọc không?

  @Prop()
  depositAmount?: number; // Số tiền cọc

  @Prop()
  daysBeforeEnd?: number; // Số ngày còn lại trước khi hết hạn

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const TerminationRequestSchema = SchemaFactory.createForClass(TerminationRequest);

