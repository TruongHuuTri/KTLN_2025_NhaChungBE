import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserProfileDocument = UserProfile & Document;

@Schema({ timestamps: true })
export class UserProfile {
  @Prop({ required: true, unique: true })
  profileId: number;

  @Prop({ required: true, unique: true })
  userId: number;

  // Basic Info
  @Prop()
  age?: number;

  @Prop({ enum: ['male', 'female', 'other'] })
  gender?: string;

  @Prop()
  occupation?: string;

  @Prop()
  income?: number;

  @Prop()
  currentLocation?: string;

  // Preferences
  // Deprecated: dùng preferredWards thay thế (giữ để tương thích tạm thời)
  @Prop({ type: [String] })
  preferredDistricts?: string[];

  @Prop({ type: [String] })
  preferredWards?: string[];

  @Prop({ type: [String] })
  preferredWardCodes?: string[];

  @Prop({
    type: {
      min: { type: Number },
      max: { type: Number }
    }
  })
  budgetRange?: { min?: number; max?: number };

  @Prop({ type: [String] })
  roomType?: string[];

  @Prop({ type: [String] })
  amenities?: string[];

  @Prop({ enum: ['quiet', 'social', 'party', 'study'] })
  lifestyle?: string;

  // Roommate specific
  @Prop()
  smoking?: boolean;

  @Prop()
  pets?: boolean;

  @Prop({ min: 1, max: 5 })
  cleanliness?: number;

  @Prop({ min: 1, max: 5 })
  socialLevel?: number;

  // Landlord specific
  @Prop({ enum: ['individual', 'company', 'agency'] })
  businessType?: string;

  @Prop({ enum: ['new', '1-2_years', '3-5_years', '5+_years'] })
  experience?: string;

  @Prop()
  propertiesCount?: number;

  @Prop({ type: [String], enum: ['phong_tro','chung_cu','nha_nguyen_can','can_ho_dv','officetel','studio'] })
  propertyTypes?: string[];

  // Deprecated: dùng targetWards/targetWardCodes và targetCityCode/Name thay thế (giữ tạm)
  @Prop({ type: [String] })
  targetDistricts?: string[];

  @Prop()
  targetCityCode?: string;

  @Prop()
  targetCityName?: string;

  @Prop({ type: [String] })
  targetWards?: string[];

  @Prop({ type: [String] })
  targetWardCodes?: string[];

  @Prop({
    type: {
      min: { type: Number },
      max: { type: Number }
    }
  })
  priceRange?: { min: number; max: number };

  @Prop({ type: [String], enum: ['sinh_vien','gia_dinh','nhan_vien_vp','cap_doi','nhom_ban'] })
  targetTenants?: string[];

  @Prop({ enum: ['strict', 'flexible', 'friendly'] })
  managementStyle?: string;

  @Prop({ enum: ['immediate', 'within_hour', 'within_day'] })
  responseTime?: string;

  @Prop({ type: [String] })
  additionalServices?: string[];

  // Business info (when upgrade to landlord)
  @Prop()
  businessLicense?: string;

  @Prop({
    type: {
      bankName: { type: String },
      accountNumber: { type: String },
      accountHolder: { type: String }
    }
  })
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };

  @Prop({ type: [String] })
  contactMethod?: string[];

  @Prop({
    type: {
      weekdays: { type: String },
      weekends: { type: String }
    }
  })
  availableTime?: {
    weekdays?: string;
    weekends?: string;
  };

  // Profile completion status
  @Prop({ default: false })
  isBasicInfoComplete: boolean;

  @Prop({ default: false })
  isPreferencesComplete: boolean;

  @Prop({ default: false })
  isLandlordInfoComplete: boolean;

  @Prop({ default: 0 })
  completionPercentage: number;
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);
