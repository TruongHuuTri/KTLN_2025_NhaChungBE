import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { RentPostsModule } from './modules/rent-posts/rent-posts.module';
import { RoommatePostsModule } from './modules/roommate-posts/roommate-posts.module';
import { FavouritesModule } from './modules/favourites/favourites.module';
import {S3Module} from './s3/s3.module';
@Module({

  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
    RentPostsModule,
    RoommatePostsModule,
    FavouritesModule,
    S3Module,
  ],
  controllers: [AppController],
  providers: [AppService],
  
})
export class AppModule {}
