import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { Contact, Event, Conversation, ContactFact, ContactTodo } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Event, Conversation, ContactFact, ContactTodo])],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}
