import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RentPostDocument = RentPost & Document;
export const RENT_POST_STATUSES = ['pending', 'active', 'inactive', 'rejected'] as const;
export type RentPostStatus = typeof RENT_POST_STATUSES[number];

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

// Tiện ích/chi phí phát sinh
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
  waterBillingType: string; // 'per_m3' | 'per_person'

  @Prop({ default: 0 })
  internetFee: number;

  @Prop({ default: 0 })
  garbageFee: number;

  @Prop({ default: 0 })
  cleaningFee: number;

  @Prop({ default: 0 })
  parkingMotorbikeFee: number;

  // Chung cư/nhà nguyên căn có thể có
  @Prop({ default: 0 })
  parkingCarFee: number;

  @Prop({ default: 0 })
  managementFee: number;

  @Prop({ default: '' })
  managementFeeUnit: string; // 'per_month' | 'per_m2_per_month'

  // Nhà nguyên căn có thể có
  @Prop({ default: 0 })
  gardeningFee: number;

  // Phòng trọ có thể có
  @Prop({ default: 0 })
  cookingGasFee: number;

  @Prop({ type: IncludedInRent, default: {} })
  includedInRent: IncludedInRent;
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

  @Prop({ type: Utilities })
  utilities?: Utilities;

  @Prop({ type: String, enum: RENT_POST_STATUSES, default: 'pending' })
  status: RentPostStatus;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const RentPostSchema = SchemaFactory.createForClass(RentPost);
