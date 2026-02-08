import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentModule } from '../agent/agent.module';
import { ConversationArchivesController } from './conversation-archives.controller';
import { ConversationArchivesService } from './conversation-archives.service';
import { ConversationArchive, Conversation, Contact, Event, ContactFact, ContactTodo } from '../entities';

@Module({
  imports: [
    AgentModule,
    TypeOrmModule.forFeature([ConversationArchive, Conversation, Contact, Event, ContactFact, ContactTodo])
  ],
  controllers: [ConversationArchivesController],
  providers: [ConversationArchivesService],
})
export class ConversationArchivesModule {}
