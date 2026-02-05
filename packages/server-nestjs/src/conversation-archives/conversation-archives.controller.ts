import { Controller, Param, Post, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ConversationArchivesService } from './conversation-archives.service';

@Controller()
export class ConversationArchivesController {
  constructor(private readonly conversationArchivesService: ConversationArchivesService) {}

  @Post('conversations/:conversationId/archive')
  @HttpCode(HttpStatus.OK)
  create(@Request() req: any, @Param('conversationId') conversationId: string) {
    const userId = req.user?.id;
    return this.conversationArchivesService.createArchive(conversationId, userId);
  }

  @Post('conversation-archives/:archiveId/apply')
  @HttpCode(HttpStatus.OK)
  apply(@Param('archiveId') archiveId: string) {
    return this.conversationArchivesService.applyArchive(archiveId);
  }

  @Post('conversation-archives/:archiveId/discard')
  @HttpCode(HttpStatus.OK)
  discard(@Param('archiveId') archiveId: string) {
    return this.conversationArchivesService.discardArchive(archiveId);
  }
}
