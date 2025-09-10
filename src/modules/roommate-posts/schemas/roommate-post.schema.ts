import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoommatePostDocument = RoommatePost & Document;

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

  // Các trường mới từ API địa chỉ
  @Prop({ required: true })
  provinceCode: string;

  @Prop({ required: true })
  provinceName: string;

  @Prop({ required: true })
  wardCode: string;

  @Prop({ required: true })
  wardName: string;

  // Thông tin bổ sung
  @Prop({ default: '' })
  additionalInfo: string;
}

@Schema({ _id: false })
export class CurrentRoom {
  @Prop({ type: Address, required: true })
  address: Address;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  area: number;

  @Prop({ required: true })
  description: string;

  @Prop()
  roomType: string; // 'single', 'double', 'shared'

  @Prop()
  currentOccupants: number;

  @Prop()
  remainingDuration: string; // '1-3 months', '3-6 months', '6-12 months', 'over_1_year'

  // Utilities chia sẻ
  @Prop({ default: '' })
  shareMethod: string; // 'split_evenly' | 'by_usage' | 'included'

  @Prop({ default: 0 })
  estimatedMonthlyUtilities: number; // Ước tính tổng phí tiện ích

  @Prop({ default: 0 })
  capIncludedAmount: number; // Mức free tối đa, vượt thì chia thêm

  @Prop({ default: 0 })
  electricityPricePerKwh: number;

  @Prop({ default: 0 })
  waterPrice: number;

  @Prop({ default: '' })
  waterBillingType: string; // 'per_m3' | 'per_person'

  @Prop({ default: 0 })
  internetFee: number;

  @Prop({ default: 0 })
  garbageFee: number;

  @Prop({ default: 0 })
  cleaningFee: number;
}

@Schema({ _id: false })
export class PersonalInfo {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  age: number;

  @Prop({ required: true })
  gender: string;

  @Prop({ required: true })
  occupation: string;

  @Prop({ type: [String], default: [] })
  hobbies: string[];

  @Prop({ type: [String], default: [] })
  habits: string[];

  @Prop()
  lifestyle: string; // 'early', 'normal', 'late'

  @Prop()
  cleanliness: string; // 'very_clean', 'clean', 'normal', 'flexible'
}

@Schema({ _id: false })
export class Requirements {
  @Prop({ type: [Number], required: true })
  ageRange: number[];

  @Prop({ required: true })
  gender: string;

  @Prop({ type: [String], default: [] })
  traits: string[];

  @Prop({ required: true })
  maxPrice: number;
}

@Schema({ timestamps: true, collection: 'roommateposts' })
export class RoommatePost {
  @Prop({ required: true, unique: true })
  roommatePostId: number;

  @Prop({ required: true })
  userId: number;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop()
  video: string;

  @Prop({ type: CurrentRoom, required: true })
  currentRoom: CurrentRoom;

  @Prop({ type: PersonalInfo, required: true })
  personalInfo: PersonalInfo;

  @Prop({ type: Requirements, required: true })
  requirements: Requirements;

  @Prop()
  phone: string;

  @Prop()
  email: string;

  @Prop({ default: 'active' })
  status: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const RoommatePostSchema = SchemaFactory.createForClass(RoommatePost);
