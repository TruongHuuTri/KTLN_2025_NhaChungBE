import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RentalContractDocument = RentalContract & Document;

@Schema({ _id: false })
export class Tenant {
  @Prop({ required: true })
  tenantId: number;

  @Prop({ required: true })
  moveInDate: Date;

  @Prop({ required: true })
  monthlyRent: number;

  @Prop({ required: true })
  deposit: number;

  @Prop({ default: 'active' })
  status: string; // 'active', 'left', 'terminated'

  @Prop()
  leftDate?: Date;
}

@Schema({ _id: false })
export class RoomInfo {
  @Prop({ required: true })
  roomNumber: string;

  @Prop({ required: true })
  area: number;

  @Prop({ required: true })
  currentOccupancy: number;
}

@Schema({ timestamps: true, collection: 'rental-contracts' })
export class RentalContract {
  @Prop({ required: true, unique: true })
  contractId: number;

  @Prop({ required: true })
  roomId: number;

  @Prop({ required: true })
  landlordId: number;

  @Prop({ required: true })
  contractType: string; // 'single', 'shared'

  @Prop({ default: 'active' })
  status: string; // 'active', 'expired', 'terminated'

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true })
  monthlyRent: number;

  @Prop({ required: true })
  deposit: number;

  @Prop()
  contractFile?: string;

  @Prop({ type: [Tenant], required: true })
  tenants: Tenant[];

  @Prop({ type: RoomInfo, required: true })
  roomInfo: RoomInfo;

  @Prop()
  terminatedAt?: Date;

  @Prop()
  terminationReason?: string;

  @Prop()
  actualEndDate?: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const RentalContractSchema = SchemaFactory.createForClass(RentalContract);
