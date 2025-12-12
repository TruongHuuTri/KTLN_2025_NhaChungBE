import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SignalsService } from './signals.service';
import { SignalsController } from './signals.controller';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [ConfigModule, SearchModule],
  providers: [SignalsService],
  controllers: [SignalsController],
  exports: [SignalsService],
})
export class SignalsModule {}

