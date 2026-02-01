import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { Conversation, Contact, User } from '../entities';
import { ConversationProcessorService } from './conversation-processor/conversation-processor.service';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Contact, User])],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationProcessorService],
})
export class ConversationsModule {}