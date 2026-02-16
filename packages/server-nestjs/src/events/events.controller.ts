import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({
    summary: '创建一条与联系人相关的事件',
    description: '用于记录某个联系人的重要事件，例如见面、通话或其他自定义事件。',
  })
  @ApiResponse({
    status: 201,
    description: '事件创建成功',
  })
  create(@Body() body: { title: string; description?: string; contactId: string; details?: Record<string, any> }) {
    return this.eventsService.create(body);
  }

  @Get('contact/:contactId')
  @ApiOperation({
    summary: '按联系人查询事件列表',
    description: '返回某个联系人相关的所有事件记录。',
  })
  @ApiParam({ name: 'contactId', description: '联系人 ID', type: String })
  @ApiResponse({
    status: 200,
    description: '成功返回事件列表',
  })
  findByContact(@Param('contactId') contactId: string) {
    return this.eventsService.findByContact(contactId);
  }
}