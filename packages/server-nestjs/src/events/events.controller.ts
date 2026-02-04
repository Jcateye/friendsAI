import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  create(@Body() body: { title: string; description?: string; contactId: string; details?: Record<string, any> }) {
    return this.eventsService.create(body);
  }

  @Get('contact/:contactId')
  findByContact(@Param('contactId') contactId: string) {
    return this.eventsService.findByContact(contactId);
  }
}