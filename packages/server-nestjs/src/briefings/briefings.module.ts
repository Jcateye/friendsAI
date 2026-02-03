import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BriefingsService } from './briefings.service';
import { BriefingsController } from './briefings.controller';
import { AiModule } from '../ai/ai.module';
import { Contact, Conversation, Event } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Conversation, Event]), AiModule],
  providers: [BriefingsService],
  controllers: [BriefingsController],
})
export class BriefingsModule {}
