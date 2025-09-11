import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  userId: number;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  avatar?: string;

  @Prop()
  phone?: string;

  @Prop({ default: 'user' })
  role: string;

  // Email verification fields
  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  emailVerifiedAt?: Date;

  // Identity verification fields
  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  verificationId?: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
