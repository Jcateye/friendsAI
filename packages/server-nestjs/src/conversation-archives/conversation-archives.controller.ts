import { Controller, Param, Post, Request, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ConversationArchivesService, ConversationArchiveResponse } from './conversation-archives.service';
import { AgentRuntimeExecutor } from '../agent/runtime/agent-runtime-executor.service';

@Controller()
export class ConversationArchivesController {
  constructor(
    private readonly conversationArchivesService: ConversationArchivesService,
    private readonly agentRuntimeExecutor: AgentRuntimeExecutor,
  ) {}

  @Post('conversations/:conversationId/archive')
  @HttpCode(HttpStatus.OK)
  async create(
    @Request() req: any,
    @Param('conversationId') conversationId: string
  ): Promise<ConversationArchiveResponse> {
    const userId = req.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    try {
      // 桥接到新的 agent runtime
      const result = await this.agentRuntimeExecutor.execute(
        'archive_brief',
        'archive_extract',
        { conversationId },
        {
          useCache: false,
          forceRefresh: false,
          userId,
        }
      );

      // 转换为旧格式 ConversationArchiveResponse
      return this.mapToArchiveResponse(result.data, conversationId);
    } catch (error) {
      // 如果新runtime失败，回退到旧实现
      console.warn('Agent runtime failed, falling back to legacy service:', error);
      return this.conversationArchivesService.createArchive(conversationId, userId);
    }
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

  /**
   * 将 agent runtime 响应映射到 ConversationArchiveResponse 格式
   */
  private mapToArchiveResponse(
    data: Record<string, unknown>,
    conversationId: string
  ): ConversationArchiveResponse {
    // 根据实际的数据结构进行映射
    const id = (data.id as string) || (data.archiveId as string) || '';
    const status = (data.status as string) || 'ready_for_review';
    const summary = (data.summary as string) || (data.summary as string | null) || null;
    const payload = (data.payload as any) || (data.archivePayload as any) || null;

    return {
      id,
      status,
      summary,
      payload,
    };
  }
}
