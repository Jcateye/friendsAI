import { Controller, Param, Post, Request, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConversationArchivesService, ConversationArchiveResponse } from './conversation-archives.service';
import { AgentRuntimeExecutor } from '../agent/runtime/agent-runtime-executor.service';

@ApiTags('conversation-archives')
@ApiBearerAuth()
@Controller()
export class ConversationArchivesController {
  constructor(
    private readonly conversationArchivesService: ConversationArchivesService,
    private readonly agentRuntimeExecutor: AgentRuntimeExecutor,
  ) {}

  @Post('conversations/:conversationId/archive')
  @ApiOperation({
    summary: '为某个会话创建归档记录',
    description:
      '触发归档提取流程：优先调用新的 Agent Runtime（archive_extract），如果失败则回退到旧版 ConversationArchivesService。',
  })
  @ApiParam({ name: 'conversationId', description: '会话 ID', type: String })
  @ApiResponse({
    status: 200,
    description: '成功创建或返回会话归档记录',
  })
  @ApiResponse({
    status: 404,
    description: '当前请求中未找到用户信息（User not found）',
  })
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
  @ApiOperation({
    summary: '应用某个会话归档',
    description: '根据归档记录中的 payload，将归档内容应用回业务（具体行为由服务内部定义）。',
  })
  @ApiParam({ name: 'archiveId', description: '会话归档 ID', type: String })
  @ApiResponse({
    status: 200,
    description: '成功应用会话归档',
  })
  @HttpCode(HttpStatus.OK)
  apply(@Param('archiveId') archiveId: string) {
    return this.conversationArchivesService.applyArchive(archiveId);
  }

  @Post('conversation-archives/:archiveId/discard')
  @ApiOperation({
    summary: '丢弃某个会话归档',
    description: '将归档记录标记为丢弃/无效，不再建议用户应用该归档。',
  })
  @ApiParam({ name: 'archiveId', description: '会话归档 ID', type: String })
  @ApiResponse({
    status: 200,
    description: '成功丢弃会话归档',
  })
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
