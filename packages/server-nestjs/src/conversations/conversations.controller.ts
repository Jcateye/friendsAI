import { Controller, Post, Get, Body, Param, Query, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { MessagesService } from './messages.service';
// import { AuthGuard } from '../auth/auth.guard'; // 假设认证守卫存在

@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  create(
    @Request() req: any,
    @Body() body: { title?: string; content?: string; contactId?: string },
  ) {
    return this.conversationsService.create(
      {
        title: body.title,
        content: body.content,
      },
      req.user?.id,
      body.contactId,
    );
  }

  @Get()
  findAll(@Request() req: any) {
    return this.conversationsService.findAll(req.user?.id);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.conversationsService.findOne(id, req.user?.id);
  }

  @Get(':id/messages')
  listMessages(
    @Request() req: any,
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.messagesService.listMessages(id, {
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      before,
      userId: req.user?.id,
    });
  }
}
