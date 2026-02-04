import { Body, Controller, Get, Param, Post, Query, Request } from '@nestjs/common';
import { ToolConfirmationsService } from './tool-confirmations.service';
import { ToolConfirmationStatus } from '../entities';

interface CreateToolConfirmationDto {
  toolName: string;
  payload?: Record<string, any>;
  conversationId?: string;
  userId?: string;
}

interface ConfirmToolDto {
  payload?: Record<string, any>;
}

interface RejectToolDto {
  reason?: string;
}

@Controller('tool-confirmations')
export class ToolConfirmationsController {
  constructor(private readonly toolConfirmationsService: ToolConfirmationsService) {}

  @Post()
  create(@Request() req: any, @Body() body: CreateToolConfirmationDto) {
    const userId = req.user?.id || body.userId || 'mock-user-id';
    return this.toolConfirmationsService.create({
      toolName: body.toolName,
      payload: body.payload,
      conversationId: body.conversationId,
      userId,
    });
  }

  @Get()
  findAll(@Query('status') status?: ToolConfirmationStatus, @Query('userId') userId?: string) {
    return this.toolConfirmationsService.findAll(status, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.toolConfirmationsService.findOne(id);
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Body() body: ConfirmToolDto) {
    return this.toolConfirmationsService.confirm(id, body.payload);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() body: RejectToolDto) {
    return this.toolConfirmationsService.reject(id, body.reason);
  }
}
