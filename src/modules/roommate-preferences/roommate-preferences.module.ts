import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RoommatePreferencesService } from './roommate-preferences.service';
import { RoommatePreferencesController, PostsRoommateController } from './roommate-preferences.controller';
import { RoommatePreference, RoommatePreferenceSchema } from './schemas/roommate-preference.schema';
import { SeekerPreference, SeekerPreferenceSchema } from './schemas/seeker-preference.schema';
import { Post, PostSchema } from '../posts/schemas/post.schema';
import { Room, RoomSchema } from '../rooms/schemas/room.schema';
import { Building, BuildingSchema } from '../rooms/schemas/building.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UserProfile, UserProfileSchema } from '../user-profiles/schemas/user-profile.schema';
import { RentalContract, RentalContractSchema } from '../contracts/schemas/rental-contract.schema';
import { Verification, VerificationSchema } from '../verifications/schemas/verification.schema';
import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RoommatePreference.name, schema: RoommatePreferenceSchema },
      { name: SeekerPreference.name, schema: SeekerPreferenceSchema },
      { name: Post.name, schema: PostSchema },
      { name: Room.name, schema: RoomSchema },
      { name: Building.name, schema: BuildingSchema },
      { name: User.name, schema: UserSchema },
      { name: UserProfile.name, schema: UserProfileSchema },
      { name: RentalContract.name, schema: RentalContractSchema },
      { name: Verification.name, schema: VerificationSchema },
    ]),
    forwardRef(() => PostsModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
      controllers: [
        RoommatePreferencesController,
        PostsRoommateController,
      ],
  providers: [RoommatePreferencesService],
  exports: [RoommatePreferencesService],
})
export class RoommatePreferencesModule {}

