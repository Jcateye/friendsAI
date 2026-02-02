import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { Conversation, Contact, User, Event } from '../entities';
import { ConversationProcessorService } from './conversation-processor/conversation-processor.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Contact, User, Event]), AiModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationProcessorService],
})
export class ConversationsModule {}