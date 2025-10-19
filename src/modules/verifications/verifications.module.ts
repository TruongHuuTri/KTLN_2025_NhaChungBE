import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VerificationsService } from './verifications.service';
import { VerificationsController } from './verifications.controller';
import { Verification, VerificationSchema } from './schemas/verification.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AdminModule } from '../admin/admin.module';
import { FileStorageService } from '../../shared/services/file-storage.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Verification.name, schema: VerificationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
    AdminModule,
  ],
  controllers: [VerificationsController],
  providers: [VerificationsService, FileStorageService],
  exports: [VerificationsService],
})
export class VerificationsModule {}
