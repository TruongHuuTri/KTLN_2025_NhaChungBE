import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { UserProfile, UserProfileSchema } from '../user-profiles/schemas/user-profile.schema';
import { Verification, VerificationSchema } from '../verifications/schemas/verification.schema';
import { Room, RoomSchema } from '../rooms/schemas/room.schema';
import { Building, BuildingSchema } from '../rooms/schemas/building.schema';
import { RentalContract, RentalContractSchema } from '../contracts/schemas/rental-contract.schema';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EmailService } from '../../shared/services/email.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Verification.name, schema: VerificationSchema },
      { name: UserProfile.name, schema: UserProfileSchema },
      { name: Room.name, schema: RoomSchema },
      { name: Building.name, schema: BuildingSchema },
      { name: RentalContract.name, schema: RentalContractSchema },
    ]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtStrategy, EmailService],
  exports: [UsersService],
})
export class UsersModule {}
