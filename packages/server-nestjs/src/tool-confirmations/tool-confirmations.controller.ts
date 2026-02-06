import { Body, Controller, Get, Param, Post, Query, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ToolConfirmationsService } from './tool-confirmations.service';
import type { ToolConfirmationStatus } from '../entities';

interface CreateToolConfirmationDto {
  toolName: string;
  payload?: Record<string, any>;
  conversationId?: string;
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
    const userId = req.user?.id;
    return this.toolConfirmationsService.create({
      toolName: body.toolName,
      payload: body.payload,
      conversationId: body.conversationId,
      userId,
    });
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('status') status?: ToolConfirmationStatus,
    @Query('userId') userId?: string,
    @Query('conversationId') conversationId?: string,
  ) {
    const resolvedUserId = userId ?? req.user?.id;
    return this.toolConfirmationsService.findAll(status, resolvedUserId, conversationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.toolConfirmationsService.findOne(id);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(@Param('id') id: string, @Body() body: ConfirmToolDto = {}) {
    return this.toolConfirmationsService.confirm(id, body.payload);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(@Param('id') id: string, @Body() body: RejectToolDto = {}) {
    return this.toolConfirmationsService.reject(id, body.reason);
  }
}
