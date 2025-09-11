import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserProfilesService } from './user-profiles.service';
import { UserProfilesController } from './user-profiles.controller';
import { UserProfile, UserProfileSchema } from './schemas/user-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserProfile.name, schema: UserProfileSchema }
    ])
  ],
  controllers: [UserProfilesController],
  providers: [UserProfilesService],
  exports: [UserProfilesService]
})
export class UserProfilesModule {}
