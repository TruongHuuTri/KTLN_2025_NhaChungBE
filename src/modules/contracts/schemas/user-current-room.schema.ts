import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserCurrentRoomDocument = UserCurrentRoom & Document;

@Schema({ timestamps: true, collection: 'user-current-room' })
export class UserCurrentRoom {
  @Prop({ required: true, unique: true })
  userId: number;

  @Prop({ required: true })
  roomId: number;

  @Prop({ required: true })
  landlordId: number;

  @Prop({ required: true })
  contractId: number;

  @Prop({ required: true })
  moveInDate: Date;

  @Prop({ required: true })
  monthlyRent: number;

  @Prop({ default: 'active' })
  status: string; // 'active', 'expired', 'terminated'

  @Prop({ default: true })
  canPostRoommate: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserCurrentRoomSchema = SchemaFactory.createForClass(UserCurrentRoom);
