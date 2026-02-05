import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { BriefingService } from './briefing/briefing.service';
import { BriefingsController } from './briefings/briefings.controller';
import { Contact, Conversation, Event } from '../entities';

@Module({
  imports: [AiModule, TypeOrmModule.forFeature([Contact, Conversation, Event])],
  providers: [BriefingService],
  controllers: [BriefingsController]
})
export class BriefingsModule {}
