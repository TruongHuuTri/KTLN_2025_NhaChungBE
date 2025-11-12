import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SeekerPreferenceDocument = SeekerPreference & Document;

@Schema({ _id: false })
export class SeekerRequirements {
  @Prop({ type: [Number], required: true })
  ageRange: number[]; // [min, max]

  @Prop({ required: true, enum: ['male', 'female', 'any'] })
  gender: string;

  @Prop({ type: [String], default: [] })
  traits: string[]; // ['sạch sẽ', 'yên tĩnh', 'hòa đồng', etc.]

  @Prop({ required: true })
  maxPrice: number;
}

@Schema({ timestamps: true, collection: 'seeker_preferences' })
export class SeekerPreference {
  @Prop({ required: true, unique: true })
  seekerPreferenceId: number;

  @Prop({ required: true, unique: true })
  userId: number; // Seeker ID

  @Prop({ type: SeekerRequirements })
  requirements?: SeekerRequirements;

  @Prop({ type: [String], default: [] })
  seekerTraits?: string[]; // Traits của chính Seeker (người tìm phòng)

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const SeekerPreferenceSchema = SchemaFactory.createForClass(SeekerPreference);
SeekerPreferenceSchema.index({ userId: 1 }, { unique: true });

