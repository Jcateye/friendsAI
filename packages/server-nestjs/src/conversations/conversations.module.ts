import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { MessagesService } from './messages.service';
import { Conversation, Contact, User, Event, Message } from '../entities';
import { ConversationProcessorService } from './conversation-processor/conversation-processor.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule, TypeOrmModule.forFeature([Conversation, Contact, User, Event, Message])],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationProcessorService, MessagesService],
  exports: [MessagesService],
})
export class ConversationsModule {}
