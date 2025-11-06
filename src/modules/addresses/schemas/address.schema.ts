import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AddressDocument = Address & Document;

@Schema({ timestamps: true, collection: 'addresses' })
export class Address {
  @Prop({ required: true })
  provinceCode: string; // Mã tỉnh (BNV)

  @Prop({ required: true })
  provinceName: string; // Tên tỉnh/TP

  @Prop()
  districtCode?: string; // Mã quận/huyện (tuỳ CSV)

  @Prop()
  districtName?: string; // Tên quận/huyện

  @Prop({ required: true })
  wardCode: string; // Mã phường/xã

  @Prop({ required: true })
  wardName: string; // Tên phường/xã

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
