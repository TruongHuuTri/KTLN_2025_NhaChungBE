import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LandlordContractsController, UserContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { RentalContract, RentalContractSchema } from './schemas/rental-contract.schema';
import { UserCurrentRoom, UserCurrentRoomSchema } from './schemas/user-current-room.schema';
import { RentalRequest, RentalRequestSchema } from './schemas/rental-request.schema';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { ContractUpdate, ContractUpdateSchema } from './schemas/contract-update.schema';
import { RoommateApplication, RoommateApplicationSchema } from './schemas/roommate-application.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RentalContract.name, schema: RentalContractSchema },
      { name: UserCurrentRoom.name, schema: UserCurrentRoomSchema },
      { name: RentalRequest.name, schema: RentalRequestSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: ContractUpdate.name, schema: ContractUpdateSchema },
      { name: RoommateApplication.name, schema: RoommateApplicationSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [LandlordContractsController, UserContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
