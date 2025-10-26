import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserProfileDocument = UserProfile & Document;

@Schema({ timestamps: true })
export class UserProfile {
  @Prop({ required: true, unique: true })
  profileId: number;

  @Prop({ required: true, unique: true })
  userId: number;

  // Preferences
  @Prop()
  preferredCity?: string;

  @Prop({ type: [String] })
  preferredWards?: string[];

  @Prop({ type: [String] })
  roomType?: string[];

  // Basic Info
  @Prop()
  occupation?: string;

  @Prop()
  pets?: boolean;

  // Contact info
  @Prop({ type: [String] })
  contactMethod?: string[];

  // Media (reference to Media collection if exists)
  // @Prop()
  // media?: string;

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
