import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { ZaloPayCallbackController } from './zalopay-callback.controller';
import { PaymentsService } from './payments.service';
import { PaymentOrder, PaymentOrderSchema } from '../contracts/schemas/payment-order.schema';
import { Invoice, InvoiceSchema } from '../contracts/schemas/invoice.schema';
import { QrCodeService } from '../../shared/services/qr-code.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentOrder.name, schema: PaymentOrderSchema },
      { name: Invoice.name, schema: InvoiceSchema }
    ]),
    ConfigModule
  ],
  controllers: [PaymentsController, ZaloPayCallbackController],
  providers: [PaymentsService, QrCodeService],
  exports: [PaymentsService]
})
export class PaymentsModule {}
