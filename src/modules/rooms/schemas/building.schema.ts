import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BuildingDocument = Building & Document;

@Schema({ _id: false })
export class Address {
  @Prop({ required: false, default: '' })
  street: string;

  @Prop({ required: true })
  ward: string;

  @Prop({ required: true })
  city: string;

  @Prop({ default: '' })
  specificAddress: string;

  @Prop({ default: false })
  showSpecificAddress: boolean;

  @Prop({ required: true })
  provinceCode: string;

  @Prop({ required: true })
  provinceName: string;

  @Prop({ required: true })
  wardCode: string;

  @Prop({ required: true })
  wardName: string;

  @Prop({ default: '' })
  additionalInfo: string;
}

@Schema({ timestamps: true, collection: 'buildings' })
export class Building {
  @Prop({ required: true, unique: true })
  buildingId: number;

  @Prop({ required: true })
  landlordId: number;

  @Prop({ required: true })
  name: string;

  @Prop({ type: Address, required: true })
  address: Address;

  @Prop({ required: true })
  totalFloors: number;

  @Prop({ required: true })
  totalRooms: number;

  @Prop({ required: true })
  buildingType: string; // 'chung-cu', 'nha-nguyen-can', 'phong-tro'

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ default: '' })
  description: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const BuildingSchema = SchemaFactory.createForClass(Building);
