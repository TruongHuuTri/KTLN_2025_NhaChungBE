import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoommatePreferenceDocument = RoommatePreference & Document;

@Schema({ _id: false })
export class Requirements {
  @Prop({ type: [Number], required: true })
  ageRange: number[]; // [min, max]

  @Prop({ required: true, enum: ['male', 'female', 'any'] })
  gender: string;

  @Prop({ type: [String], default: [] })
  traits: string[]; // ['sạch sẽ', 'yên tĩnh', 'hòa đồng', etc.]

  @Prop({ required: true })
  maxPrice: number;

  @Prop({ enum: ['smoker', 'non_smoker', 'any'], default: 'any' })
  smokingPreference?: string; // Yêu cầu về hút thuốc

  @Prop({ enum: ['has_pets', 'no_pets', 'any'], default: 'any' })
  petsPreference?: string; // Yêu cầu về thú cưng
}

@Schema({ timestamps: true, collection: 'roommate_preferences' })
export class RoommatePreference {
  @Prop({ required: true, unique: true })
  preferenceId: number;

  @Prop({ required: true })
  userId: number;

  @Prop({ required: true })
  roomId: number;

  @Prop({ default: false })
  enabled: boolean;

  @Prop({ type: Requirements })
  requirements?: Requirements;

  @Prop({ type: [String], default: [] })
  posterTraits?: string[]; // Traits của chính Poster (người đăng bài)

  @Prop()
  posterAge?: number; // Tuổi của Poster (người đăng bài)

  @Prop()
  posterGender?: string; // Giới tính của Poster (người đăng bài)

  @Prop({ enum: ['smoker', 'non_smoker'] })
  posterSmoking?: string; // Hút thuốc của Poster (người đăng bài)

  @Prop({ enum: ['has_pets', 'no_pets'] })
  posterPets?: string; // Thú cưng của Poster (người đăng bài)

  @Prop()
  postId?: number; // ID của bài đăng được tạo tự động

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const RoommatePreferenceSchema = SchemaFactory.createForClass(RoommatePreference);
RoommatePreferenceSchema.index({ userId: 1, roomId: 1 }, { unique: true });

