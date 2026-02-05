import { Controller, Param, Post, Request } from '@nestjs/common';
import { ConversationArchivesService } from './conversation-archives.service';

@Controller()
export class ConversationArchivesController {
  constructor(private readonly conversationArchivesService: ConversationArchivesService) {}

  @Post('conversations/:conversationId/archive')
  create(@Request() req: any, @Param('conversationId') conversationId: string) {
    const userId = req.user?.id || 'mock-user-id';
    return this.conversationArchivesService.createArchive(conversationId, userId);
  }

  @Post('conversation-archives/:archiveId/apply')
  apply(@Param('archiveId') archiveId: string) {
    return this.conversationArchivesService.applyArchive(archiveId);
  }

  @Post('conversation-archives/:archiveId/discard')
  discard(@Param('archiveId') archiveId: string) {
    return this.conversationArchivesService.discardArchive(archiveId);
  }
}
