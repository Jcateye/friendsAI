import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { Contact, Event, Conversation } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Event, Conversation])],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}