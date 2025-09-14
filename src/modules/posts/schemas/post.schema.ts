import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PostDocument = Post & Document;

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

@Schema({ _id: false })
export class BasicInfo {
  @Prop({ required: true })
  area: number;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 0 })
  deposit: number;

  @Prop({ default: '' })
  furniture: string;

  @Prop({ default: 0 })
  bedrooms: number;

  @Prop({ default: 0 })
  bathrooms: number;

  @Prop({ default: '' })
  direction: string;

  @Prop({ default: '' })
  legalStatus: string;
}

@Schema({ _id: false })
export class ChungCuInfo {
  @Prop({ default: '' })
  buildingName: string;

  @Prop({ default: '' })
  blockOrTower: string;

  @Prop({ default: 0 })
  floorNumber: number;

  @Prop({ default: '' })
  unitCode: string;

  @Prop({ default: '' })
  propertyType: string; // 'chung-cu', 'can-ho-dv', 'officetel', 'studio'

  @Prop({ default: 0 })
  bedrooms: number;

  @Prop({ default: 0 })
  bathrooms: number;

  @Prop({ default: '' })
  direction: string; // 'dong', 'tay', 'nam', 'bac', 'dong-nam', 'dong-bac', 'tay-nam', 'tay-bac'

  @Prop({ default: '' })
  furniture: string; // 'full', 'co-ban', 'trong'

  @Prop({ default: '' })
  legalStatus: string; // 'co-so-hong', 'cho-so'
}

@Schema({ _id: false })
export class NhaNguyenCanInfo {
  @Prop({ default: '' })
  khuLo: string;

  @Prop({ default: '' })
  unitCode: string;

  @Prop({ default: '' })
  propertyType: string; // 'nha-pho', 'biet-thu', 'nha-hem', 'nha-cap4'

  @Prop({ default: 0 })
  bedrooms: number;

  @Prop({ default: 0 })
  bathrooms: number;

  @Prop({ default: '' })
  direction: string; // 'dong', 'tay', 'nam', 'bac', 'dong-nam', 'dong-bac', 'tay-nam', 'tay-bac'

  @Prop({ default: 0 })
  totalFloors: number;

  @Prop({ default: '' })
  legalStatus: string; // 'co-so-hong', 'cho-so'

  @Prop({ default: '' })
  furniture: string; // 'full', 'co-ban', 'trong'

  @Prop({ type: [String], default: [] })
  features: string[]; // 'Hẻm xe hơi', 'Nhà nở hậu', 'Nhà tóp hậu', etc.

  @Prop({ default: 0 })
  landArea: number; // Diện tích đất (m²)

  @Prop({ default: 0 })
  usableArea: number; // Diện tích sử dụng (m²)

  @Prop({ default: 0 })
  width: number; // Chiều ngang (m)

  @Prop({ default: 0 })
  length: number; // Chiều dài (m)
}

@Schema({ _id: false })
export class IncludedInRent {
  @Prop({ default: false })
  electricity: boolean;

  @Prop({ default: false })
  water: boolean;

  @Prop({ default: false })
  internet: boolean;

  @Prop({ default: false })
  garbage: boolean;

  @Prop({ default: false })
  cleaning: boolean;

  @Prop({ default: false })
  parkingMotorbike: boolean;

  @Prop({ default: false })
  parkingCar: boolean;

  @Prop({ default: false })
  managementFee: boolean;
}

@Schema({ _id: false })
export class Utilities {
  @Prop({ default: 0 })
  electricityPricePerKwh: number;

  @Prop({ default: 0 })
  waterPrice: number;

  @Prop({ default: '' })
  waterBillingType: string;

  @Prop({ default: 0 })
  internetFee: number;

  @Prop({ default: 0 })
  garbageFee: number;

  @Prop({ default: 0 })
  cleaningFee: number;

  @Prop({ default: 0 })
  parkingMotorbikeFee: number;

  @Prop({ default: 0 })
  parkingCarFee: number;

  @Prop({ default: 0 })
  managementFee: number;

  @Prop({ default: '' })
  managementFeeUnit: string;

  @Prop({ default: 0 })
  gardeningFee: number;

  @Prop({ default: 0 })
  cookingGasFee: number;

  @Prop({ type: IncludedInRent, default: {} })
  includedInRent: IncludedInRent;
}

@Schema({ _id: false })
export class RoomInfo {
  @Prop({ type: Address })
  address?: Address;

  @Prop({ type: BasicInfo })
  basicInfo?: BasicInfo;

  @Prop({ type: ChungCuInfo })
  chungCuInfo?: ChungCuInfo;

  @Prop({ type: NhaNguyenCanInfo })
  nhaNguyenCanInfo?: NhaNguyenCanInfo;

  @Prop({ type: Utilities })
  utilities?: Utilities;
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

  @Prop({ required: true })
  lifestyle: string;

  @Prop({ required: true })
  cleanliness: string;
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

@Schema({ timestamps: true, collection: 'posts' })
export class Post {
  @Prop({ required: true, unique: true })
  postId: number;

  @Prop({ required: true })
  userId: number;

  @Prop({ required: true })
  postType: string; // 'cho-thue' | 'tim-o-ghep'

  @Prop({ required: false })
  category: string; // 'chung-cu', 'phong-tro', 'nha-nguyen-can', 'o-ghep'

  // Thông tin bài đăng
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  images: string[];  // Optional - nếu có thì dùng, không có thì lấy từ Room

  @Prop({ type: [String], default: [] })
  videos: string[];  // Optional - nếu có thì dùng, không có thì lấy từ Room

  // Liên kết với room (optional)
  @Prop()
  roomId?: number;

  @Prop()
  buildingId?: number;

  @Prop()
  landlordId?: number;

  @Prop({ default: false })
  isManaged: boolean;

  @Prop({ default: 'manual_post' })
  source: string; // 'room_management' | 'manual_post' | 'user_post'

  // Thông tin phòng (chỉ khi không có roomId)
  @Prop({ type: RoomInfo })
  roomInfo?: RoomInfo;

  // Thông tin riêng cho roommate posts
  @Prop({ type: PersonalInfo })
  personalInfo?: PersonalInfo;

  @Prop({ type: Requirements })
  requirements?: Requirements;

  // Liên hệ
  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  // Trạng thái
  @Prop({ default: 'pending' })
  status: string; // 'pending', 'active', 'inactive', 'rejected'

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);
