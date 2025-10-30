import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { FavouritesModule } from './modules/favourites/favourites.module';
import { VerificationsModule } from './modules/verifications/verifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import {S3Module} from './s3/s3.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmailVerificationModule } from './modules/email-verification/email-verification.module';
import { UserProfilesModule } from './modules/user-profiles/user-profiles.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { PostsModule } from './modules/posts/posts.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NlpSearchModule } from './nlp-search/nlp-search.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { EmailService } from './shared/services/email.service';
import { OTPService } from './shared/services/otp.service';
import { SearchModule } from './modules/search/search.module';
@Module({

  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGO_URI') ||
          'mongodb+srv://minhquangyi:uLzta6al7EHdfli4@cluster0.bnk2j.mongodb.net/nha_chung_db?retryWrites=true&w=majority',
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    FavouritesModule,
    VerificationsModule,
    AdminModule,
    AddressesModule,
    S3Module,
    AuthModule,
    EmailVerificationModule,
    UserProfilesModule,
    RoomsModule,
    PostsModule,
    ContractsModule,
    PaymentsModule,
    NlpSearchModule,
    ReviewsModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService, EmailService, OTPService],
  
})
export class AppModule {}
