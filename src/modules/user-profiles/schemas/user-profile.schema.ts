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
  dateOfBirth?: Date;

  @Prop()
  gender?: string;

  @Prop()
  occupation?: string;

  @Prop()
  income?: number;

  @Prop()
  currentLocation?: string;

  // Preferences
  @Prop()
  preferredCity?: string;

  @Prop({ type: [String] })
  preferredWards?: string[];

  @Prop({ type: [String] })
  preferredWardCodes?: string[];

  @Prop({ type: [String] })
  preferredDistricts?: string[];

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

  @Prop()
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

  // Contact info
  @Prop({ type: [String] })
  contactMethod?: string[];

  @Prop({
    type: {
      _id: false,
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

  @Prop({ default: 0 })
  completionPercentage: number;
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);
UserProfileSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
});
