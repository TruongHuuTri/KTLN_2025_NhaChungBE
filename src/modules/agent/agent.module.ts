import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ParserAgent } from './parser.agent';
import { OrchestratorService } from './orchestrator.service';
import { SearchModule } from '../search/search.module';
import { RetrieverAgent } from './retriever.agent';
import { LocationAgent } from './location.agent';
import { PersonalizationAgent } from './personalization.agent';
import { RerankAgent } from './rerank.agent';
import {
  UserProfile,
  UserProfileSchema,
} from '../user-profiles/schemas/user-profile.schema';

@Module({
  imports: [
    ConfigModule,
    SearchModule,
    MongooseModule.forFeature([
      { name: UserProfile.name, schema: UserProfileSchema },
    ]),
  ],
  providers: [
    ParserAgent,
    RetrieverAgent,
    LocationAgent,
    PersonalizationAgent,
    OrchestratorService,
    RerankAgent,
  ],
  exports: [
    ParserAgent,
    RetrieverAgent,
    LocationAgent,
    PersonalizationAgent,
    OrchestratorService,
    RerankAgent,
  ],
})
export class AgentModule {}
