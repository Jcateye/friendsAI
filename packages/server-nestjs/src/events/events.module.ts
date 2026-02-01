import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Event, Contact } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Contact])],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}