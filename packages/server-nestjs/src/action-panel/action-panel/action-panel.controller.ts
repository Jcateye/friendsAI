import { Controller, Get, Request, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NetworkActionService } from '../../agent/capabilities/network_action/network-action.service';
// import { AuthGuard } from '../../auth/auth.guard'; // 假设认证守卫存在

@ApiTags('action-panel')
@ApiBearerAuth()
@Controller('action-panel')
export class ActionPanelController {
  constructor(
    private readonly networkActionService: NetworkActionService,
  ) {}

  @Get('dashboard')
  @ApiOperation({
    summary: '获取当前用户的行动面板（Dashboard）',
    description:
      '聚合当前用户需要跟进的人、推荐联系人的列表等高优先级行动信息。' +
      '通过 NetworkActionService（Agent Runtime）返回聚合结果。',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回当前用户的行动面板数据',
  })
  @ApiResponse({
    status: 404,
    description: '当前请求中未找到用户信息（User not found）',
  })
  // @UseGuards(AuthGuard)
  async getDashboard(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    // 桥接到 NetworkActionService（它内部使用 AgentRuntimeExecutor）
    const result = await this.networkActionService.run({
      userId,
      forceRefresh: false,
    });

    // 转换为旧格式
    return this.mapToDashboardResponse(result);
  }

  /**
   * 将 NetworkActionOutput 映射到 dashboard 格式
   */
  private mapToDashboardResponse(output: {
    followUps: Array<{
      contactId: string;
      contactName: string;
      reason: string;
      priority: 'high' | 'medium' | 'low';
      suggestedAction: string;
    }>;
    recommendations: Array<{
      type: 'connection' | 'followup' | 'introduction';
      description: string;
      contacts: string[];
      confidence: number;
    }>;
    synthesis: string;
    nextActions: Array<{
      action: string;
      priority: 'high' | 'medium' | 'low';
      estimatedTime?: string;
    }>;
    metadata: {
      cached: boolean;
      sourceHash: string;
      generatedAt: number;
    };
  }): {
    followUps: Array<{ contactId: string; contactName: string; reason: string }>;
    recommendedContacts: Array<{ contactId: string; contactName: string; reason: string; openingLine: string }>;
  } {
    // 将 followUps 映射到旧格式（只包含必要字段）
    const followUps = output.followUps.map((item) => ({
      contactId: item.contactId,
      contactName: item.contactName,
      reason: item.reason,
    }));

    // 将 recommendations 转换为 recommendedContacts 格式
    // 从 recommendations 中提取联系人信息，生成 openingLine
    const recommendedContacts = output.recommendations
      .flatMap((rec) =>
        rec.contacts.map((contactId) => {
          // 从 followUps 中查找对应的联系人名称
          const followUp = output.followUps.find((f) => f.contactId === contactId);
          const contactName = followUp?.contactName || contactId;

          return {
            contactId,
            contactName,
            reason: rec.description,
            openingLine: rec.type === 'introduction'
              ? `我想介绍你认识 ${contactName}...`
              : rec.type === 'followup'
              ? `关于我们上次的对话...`
              : `你好 ${contactName}，我想和你聊聊...`,
          };
        })
      )
      .slice(0, 10); // 限制数量

    return {
      followUps,
      recommendedContacts,
    };
  }
}
