import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Room, RoomSchema } from '../modules/rooms/schemas/room.schema';
import { NlpSearchController } from './nlp-search.controller';
import { NlpSearchService } from './nlp-search.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Room.name, schema: RoomSchema }]),
  ],
  controllers: [NlpSearchController],
  providers: [NlpSearchService],
})
export class NlpSearchModule {}


