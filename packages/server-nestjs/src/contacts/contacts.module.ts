import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { Contact, Event, Conversation, User, Briefing } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Event, Conversation, User, Briefing])],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}