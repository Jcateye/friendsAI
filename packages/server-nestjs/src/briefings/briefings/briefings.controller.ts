import { Controller, Get, Post, Param, Request, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BriefingService, BriefSnapshot } from '../briefing/briefing.service';
import { AgentRuntimeExecutor } from '../../agent/runtime/agent-runtime-executor.service';
// import { AuthGuard } from '../../auth/auth.guard'; // 假设认证守卫存在

@ApiTags('briefings')
@ApiBearerAuth()
@Controller('contacts')
export class BriefingsController {
  constructor(
    private readonly briefingService: BriefingService,
    private readonly agentRuntimeExecutor: AgentRuntimeExecutor,
  ) {}

  @Get(':contactId/brief')
  @ApiOperation({
    summary: '获取某个联系人的简报（brief）',
    description:
      '优先通过新的 Agent Runtime 生成并获取联系人简报，如果新 runtime 失败则回退到旧版 BriefingService。',
  })
  @ApiParam({ name: 'contactId', description: '联系人 ID', type: String })
  @ApiResponse({
    status: 200,
    description: '成功返回联系人简报（可能来自缓存或回退逻辑）',
  })
  @ApiResponse({
    status: 404,
    description: '当前请求中未找到用户信息（User not found）',
  })
  // @UseGuards(AuthGuard)
  async getBriefing(
    @Request() req: any,
    @Param('contactId') contactId: string
  ): Promise<BriefSnapshot | null> {
    const userId = req.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    try {
      // 桥接到新的 agent runtime
      const result = await this.agentRuntimeExecutor.execute(
        'archive_brief',
        'brief_generate',
        { contactId },
        {
          useCache: true,
          forceRefresh: false,
          userId,
        }
      );

      // 转换为旧格式 BriefSnapshot
      return this.mapToBriefSnapshot(result.data, contactId);
    } catch (error) {
      // 如果新runtime失败，回退到旧实现
      console.warn('Agent runtime failed, falling back to legacy service:', error);
      return this.briefingService.getBriefing(contactId, userId);
    }
  }

  @Post(':contactId/brief')
  @ApiOperation({
    summary: '刷新某个联系人的简报（brief）',
    description:
      '强制通过新的 Agent Runtime 重新生成联系人简报，如果新 runtime 失败则回退到旧版 BriefingService 刷新逻辑。',
  })
  @ApiParam({ name: 'contactId', description: '联系人 ID', type: String })
  @ApiResponse({
    status: 200,
    description: '成功刷新并返回联系人简报',
  })
  @ApiResponse({
    status: 404,
    description: '当前请求中未找到用户信息（User not found）',
  })
  // @UseGuards(AuthGuard)
  async refreshBriefing(
    @Request() req: any,
    @Param('contactId') contactId: string
  ): Promise<BriefSnapshot> {
    const userId = req.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    try {
      // 桥接到新的 agent runtime，强制刷新
      const result = await this.agentRuntimeExecutor.execute(
        'archive_brief',
        'brief_generate',
        { contactId },
        {
          useCache: false,
          forceRefresh: true,
          userId,
        }
      );

      return this.mapToBriefSnapshot(result.data, contactId);
    } catch (error) {
      // 如果新runtime失败，回退到旧实现
      console.warn('Agent runtime failed, falling back to legacy service:', error);
      return this.briefingService.refreshBriefing(contactId, userId);
    }
  }

  @Post(':contactId/brief/refresh')
  @ApiOperation({
    summary: '显式刷新联系人简报（同 POST /contacts/:contactId/brief）',
    description: '这是一个语义更明确的刷新接口，行为与 POST /contacts/:contactId/brief 保持一致。',
  })
  @ApiParam({ name: 'contactId', description: '联系人 ID', type: String })
  @ApiResponse({
    status: 200,
    description: '成功刷新并返回联系人简报',
  })
  @ApiResponse({
    status: 404,
    description: '当前请求中未找到用户信息（User not found）',
  })
  // @UseGuards(AuthGuard)
  async refreshBriefingExplicit(
    @Request() req: any,
    @Param('contactId') contactId: string
  ): Promise<BriefSnapshot> {
    // 与 POST /contacts/:contactId/brief 相同
    return this.refreshBriefing(req, contactId);
  }

  /**
   * 将 agent runtime 响应映射到 BriefSnapshot 格式
   */
  private mapToBriefSnapshot(data: Record<string, unknown>, contactId: string): BriefSnapshot {
    // 根据实际的数据结构进行映射
    // 这里假设 data 包含 content, generated_at, source_hash 等字段
    const id = (data.id as string) || (data.briefId as string) || '';
    const content = (data.content as string) || (data.briefing as string) || '';
    const generatedAt = (data.generated_at as string) || (data.generatedAt as string) || new Date().toISOString();
    const sourceHash = (data.source_hash as string) || (data.sourceHash as string) || '';

    return {
      id,
      contact_id: contactId,
      content,
      generated_at: generatedAt,
      source_hash: sourceHash,
    };
  }
}
