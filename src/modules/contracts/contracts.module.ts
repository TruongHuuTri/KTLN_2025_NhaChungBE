import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LandlordContractsController, UserContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { RentalContract, RentalContractSchema } from './schemas/rental-contract.schema';
import { RentalRequest, RentalRequestSchema } from './schemas/rental-request.schema';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { ContractUpdate, ContractUpdateSchema } from './schemas/contract-update.schema';
import { RentalHistory, RentalHistorySchema } from './schemas/rental-history.schema';
import { Post, PostSchema } from '../posts/schemas/post.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Room, RoomSchema } from '../rooms/schemas/room.schema';
import { Building, BuildingSchema } from '../rooms/schemas/building.schema';
import { UsersModule } from '../users/users.module';
import { PdfService } from '../../shared/services/pdf.service';
import { MaintenanceFeeService } from '../../shared/services/maintenance-fee.service';
import { ContractExpiryService } from '../../shared/services/contract-expiry.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RentalContract.name, schema: RentalContractSchema },
      { name: RentalRequest.name, schema: RentalRequestSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: ContractUpdate.name, schema: ContractUpdateSchema },
      { name: RentalHistory.name, schema: RentalHistorySchema },
      { name: Post.name, schema: PostSchema },
      { name: User.name, schema: UserSchema },
      { name: Room.name, schema: RoomSchema },
      { name: Building.name, schema: BuildingSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
  ],
  controllers: [LandlordContractsController, UserContractsController],
  providers: [ContractsService, PdfService, MaintenanceFeeService, ContractExpiryService],
  exports: [ContractsService, PdfService, MaintenanceFeeService, ContractExpiryService],
})
export class ContractsModule {}
