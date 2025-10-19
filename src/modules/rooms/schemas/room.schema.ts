import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UtilityType } from '../../../shared/types/utilities.types';

export type RoomDocument = Room & Document;

@Schema({ _id: false })
export class GeoLocation {
  @Prop({ type: String, enum: ['Point'], default: 'Point' })
  type: 'Point';

  @Prop({ type: [Number], required: true })
  coordinates: number[]; // [longitude, latitude]
}

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

  // GeoJSON lưu ngay trong address để hỗ trợ truy vấn không gian
  @Prop({ type: GeoLocation, required: false })
  location?: GeoLocation;
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

  @Prop({ default: 0 })
  landArea: number;

  @Prop({ default: 0 })
  usableArea: number;

  @Prop({ default: 0 })
  width: number;

  @Prop({ default: 0 })
  length: number;

  @Prop({ type: [String], default: [] })
  features: string[];
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

  @Prop({ type: IncludedInRent, default: {} })
  includedInRent: IncludedInRent;
}

@Schema({ _id: false })
export class CurrentTenant {
  @Prop({ required: true })
  userId: number;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  dateOfBirth: Date;

  @Prop({ required: true })
  gender: string;

  @Prop({ required: true })
  occupation: string;

  @Prop({ required: true })
  moveInDate: Date;

  @Prop({ required: true })
  lifestyle: string;

  @Prop({ required: true })
  cleanliness: string;
}

@Schema({ timestamps: true, collection: 'rooms' })
export class Room {
  @Prop({ required: true, unique: true })
  roomId: number;

  @Prop({ required: true })
  landlordId: number;

  @Prop({ required: true })
  buildingId: number;

  @Prop({ required: true })
  roomNumber: string;

  @Prop({ required: true })
  category: string; // 'phong-tro', 'chung-cu', 'nha-nguyen-can'

  // BasicInfo
  @Prop({ required: true })
  area: number;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 0 })
  deposit: number;

  @Prop({ default: '' })
  furniture: string;

  // Thông tin riêng theo loại
  @Prop({ type: ChungCuInfo })
  chungCuInfo?: ChungCuInfo;

  @Prop({ type: NhaNguyenCanInfo })
  nhaNguyenCanInfo?: NhaNguyenCanInfo;

  // Utilities
  @Prop({ type: Utilities })
  utilities?: Utilities;

  // Danh sách tiện ích có sẵn
  @Prop({ type: [String], enum: Object.values(UtilityType), default: [] })
  availableUtilities: UtilityType[];

  // Address
  @Prop({ type: Address, required: true })
  address: Address;

  @Prop({ type: GeoLocation, required: false })
  // Lưu ý: Lưu trùng ở cấp root để dễ index/geoNear nếu cần (tuỳ chọn)
  // Tuy nhiên, ta sẽ sử dụng trường lồng trong address: address.location
  location?: GeoLocation;

  // Thông tin cho ở ghép
  @Prop({ required: true })
  maxOccupancy: number;

  @Prop({ required: true })
  canShare: boolean;

  @Prop({ default: 0 })
  sharePrice: number;

  @Prop({ default: 0 })
  currentOccupants: number;

  @Prop({ default: 0 })
  availableSpots: number;

  // Thông tin chia sẻ tiện ích
  @Prop({ default: 'split_evenly' })
  shareMethod: string;

  @Prop({ default: 0 })
  estimatedMonthlyUtilities: number;

  @Prop({ default: 0 })
  capIncludedAmount: number;

  // Thông tin người ở hiện tại
  @Prop({ type: [CurrentTenant], default: [] })
  currentTenants: CurrentTenant[];

  // Media & mô tả
  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: [String], default: [] })
  videos: string[];

  @Prop({ default: '' })
  description: string;

  // Trạng thái
  @Prop({ default: 'available' })
  status: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const RoomSchema = SchemaFactory.createForClass(Room);
// 2dsphere index trên GeoJSON location trong address
RoomSchema.index({ 'address.location': '2dsphere' });
