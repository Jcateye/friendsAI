import { Controller, Post, Get, Body, Param, Request, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('conversations')
@UseGuards(AuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  create(@Request() req: any, @Body() body: { content: string; contactId?: string }) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    const userId = req.user.id;
    return this.conversationsService.create(body.content, userId, body.contactId);
  }

  @Get()
  findAll(@Request() req: any) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    return this.conversationsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    return this.conversationsService.findOne(id, req.user.id);
  }

  @Post(':id/archive')
  archive(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { archiveResult?: Record<string, any> | null },
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    return this.conversationsService.archive(id, req.user.id, body?.archiveResult);
  }
}
