import { Controller, Post, Get, Body, Param, Request, UseGuards } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
// import { AuthGuard } from '../auth/auth.guard'; // 假设认证守卫存在

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  // @UseGuards(AuthGuard) // 启用认证守卫
  create(@Request() req: any, @Body() body: { content: string; contactId?: string }) {
    // 假设 req.user.id 由认证守卫提供
    const userId = req.user?.id || 'mock-user-id'; // 暂时使用 mock-user-id
    return this.conversationsService.create(body.content, userId, body.contactId);
  }

  @Get()
  findAll() {
    return this.conversationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.conversationsService.findOne(id);
  }
}
