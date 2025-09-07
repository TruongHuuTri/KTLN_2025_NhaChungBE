import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RentPostDocument = RentPost & Document;

@Schema({ _id: false })
export class Address {
  @Prop({ required: true })
  street: string;

  @Prop({ required: true })
  ward: string;

  @Prop({ required: true })
  district: string;

  @Prop({ required: true })
  city: string;

  @Prop({ default: '' })
  houseNumber: string;

  @Prop({ default: false })
  showHouseNumber: boolean;
}

// Thông tin chung cho tất cả loại nhà
@Schema({ _id: false })
export class BasicInfo {
  @Prop({ required: true })
  area: number; // Diện tích (m²)

  @Prop({ required: true })
  price: number; // Giá thuê (đ/tháng)

  @Prop({ default: 0 })
  deposit: number; // Số tiền cọc (đ)

  @Prop({ default: '' })
  furniture: string; // Tình trạng nội thất: 'full', 'co-ban', 'trong'

  @Prop({ default: 0 })
  bedrooms: number; // Số phòng ngủ

  @Prop({ default: 0 })
  bathrooms: number; // Số phòng vệ sinh

  @Prop({ default: '' })
  direction: string; // Hướng: 'dong', 'tay', 'nam', 'bac', etc.

  @Prop({ default: '' })
  legalStatus: string; // Tình trạng sổ: 'co-so-hong', 'cho-so'
}

// Thông tin riêng cho Chung cư
@Schema({ _id: false })
export class ChungCuInfo {
  @Prop({ default: '' })
  buildingName: string; // Tên tòa nhà/dự án

  @Prop({ default: '' })
  blockOrTower: string; // Block/Tháp

  @Prop({ default: 0 })
  floorNumber: number; // Tầng số

  @Prop({ default: '' })
  unitCode: string; // Mã căn

  @Prop({ default: '' })
  propertyType: string; // Loại hình: 'chung-cu', 'can-ho-dv', 'officetel', 'studio'
}

// Thông tin riêng cho Nhà nguyên căn
@Schema({ _id: false })
export class NhaNguyenCanInfo {
  @Prop({ default: '' })
  khuLo: string; // Tên khu/lô

  @Prop({ default: '' })
  unitCode: string; // Mã căn

  @Prop({ default: '' })
  propertyType: string; // Loại hình: 'nha-pho', 'biet-thu', 'nha-hem', 'nha-cap4'

  @Prop({ default: 0 })
  totalFloors: number; // Tổng số tầng

  @Prop({ default: 0 })
  landArea: number; // Diện tích đất (m²)

  @Prop({ default: 0 })
  usableArea: number; // Diện tích sử dụng (m²)

  @Prop({ default: 0 })
  width: number; // Chiều ngang (m)

  @Prop({ default: 0 })
  length: number; // Chiều dài (m)

  @Prop({ type: [String], default: [] })
  features: string[]; // Đặc điểm nhà/đất
}

@Schema({ timestamps: true, collection: 'rentposts' })
export class RentPost {
  @Prop({ required: true, unique: true })
  rentPostId: number;

  @Prop({ required: true })
  userId: number;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: [String], default: [] })
  videos: string[];

  @Prop({ type: Address, required: true })
  address: Address;

  @Prop({ required: true })
  category: string; // 'phong-tro', 'chung-cu', 'nha-nguyen-can'

  @Prop({ type: BasicInfo, required: true })
  basicInfo: BasicInfo;

  // Thông tin riêng cho từng loại
  @Prop({ type: ChungCuInfo })
  chungCuInfo?: ChungCuInfo;

  @Prop({ type: NhaNguyenCanInfo })
  nhaNguyenCanInfo?: NhaNguyenCanInfo;

  @Prop({ default: 'active' })
  status: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const RentPostSchema = SchemaFactory.createForClass(RentPost);
