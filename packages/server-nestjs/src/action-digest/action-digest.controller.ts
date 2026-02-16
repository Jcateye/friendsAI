import {
  Controller,
  Get,
  Post,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ActionDigestService } from './action-digest.service';
import type { DailyActionDigestView } from './action-digest.types';

@ApiTags('action-digest')
@ApiBearerAuth()
@Controller('action-digest')
export class ActionDigestController {
  constructor(private readonly actionDigestService: ActionDigestService) {}

  @Get('today')
  @ApiOperation({
    summary: '获取今日行动简报',
    description: '聚合 network_action 与 contact_insight 输出，返回今日 top-3 行动项。',
  })
  @ApiResponse({ status: 200, description: '返回今日行动简报' })
  async getToday(@Request() req: any): Promise<DailyActionDigestView> {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.actionDigestService.getTodayDigest(userId, false);
  }

  @Post('refresh')
  @ApiOperation({
    summary: '刷新今日行动简报',
    description: '强制重新计算今日 top-3 行动项并覆盖当日缓存。',
  })
  @ApiResponse({ status: 200, description: '返回刷新后的今日行动简报' })
  async refresh(@Request() req: any): Promise<DailyActionDigestView> {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.actionDigestService.getTodayDigest(userId, true);
  }
}
