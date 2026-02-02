import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BriefingService } from './briefing/briefing.service';
import { BriefingsController } from './briefings/briefings.controller';
import { AiModule } from '../ai/ai.module';
import { Contact, Conversation, Event } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Conversation, Event]), AiModule],
  providers: [BriefingService],
  controllers: [BriefingsController],
})
export class BriefingsModule {}
