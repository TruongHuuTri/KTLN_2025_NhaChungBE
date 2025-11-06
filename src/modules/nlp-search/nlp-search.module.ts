import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Room, RoomSchema } from '../rooms/schemas/room.schema';
import { NlpSearchController } from './nlp-search.controller';
import { NlpSearchService } from './nlp-search.service';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Room.name, schema: RoomSchema }]),
    SearchModule,
  ],
  controllers: [NlpSearchController],
  providers: [NlpSearchService],
})
export class NlpSearchModule {}


