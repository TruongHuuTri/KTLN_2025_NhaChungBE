import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { ZaloPayCallbackController } from './zalopay-callback.controller';
import { PaymentsService } from './payments.service';
import { PaymentOrder, PaymentOrderSchema } from '../contracts/schemas/payment-order.schema';
import { Invoice, InvoiceSchema } from '../contracts/schemas/invoice.schema';
import { RentalRequest, RentalRequestSchema } from '../contracts/schemas/rental-request.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Room, RoomSchema } from '../rooms/schemas/room.schema';
import { Building, BuildingSchema } from '../rooms/schemas/building.schema';
import { QrCodeService } from '../../shared/services/qr-code.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentOrder.name, schema: PaymentOrderSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: RentalRequest.name, schema: RentalRequestSchema },
      { name: User.name, schema: UserSchema },
      { name: Room.name, schema: RoomSchema },
      { name: Building.name, schema: BuildingSchema }
    ]),
    ConfigModule
  ],
  controllers: [PaymentsController, ZaloPayCallbackController],
  providers: [PaymentsService, QrCodeService],
  exports: [PaymentsService]
})
export class PaymentsModule {}
