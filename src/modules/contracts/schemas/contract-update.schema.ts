import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContractUpdateDocument = ContractUpdate & Document;

@Schema({ timestamps: true, collection: 'contract-updates' })
export class ContractUpdate {
  @Prop({ required: true })
  contractId: number;

  @Prop({ required: true })
  updateType: string; // 'add_tenant', 'remove_tenant', 'modify_terms'

  @Prop({ type: Object, required: true })
  updateData: any;

  @Prop({ required: true })
  updatedBy: number;

  @Prop({ default: '' })
  reason: string;

  @Prop()
  createdAt: Date;
}

export const ContractUpdateSchema = SchemaFactory.createForClass(ContractUpdate);
