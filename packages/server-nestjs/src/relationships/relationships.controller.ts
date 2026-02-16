import {
  Controller,
  Get,
  Query,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RelationshipsService } from './relationships.service';
import type {
  RelationshipHealthSummaryResponse,
  RelationshipRiskQueueResponse,
} from './relationships.types';

@ApiTags('relationships')
@ApiBearerAuth()
@Controller('relationships')
export class RelationshipsController {
  constructor(private readonly relationshipsService: RelationshipsService) {}

  @Get('health')
  @ApiOperation({
    summary: '获取关系健康概览',
    description: '返回当前用户关系健康分层统计，支持 forceRecompute 触发重算。',
  })
  @ApiResponse({ status: 200, description: '返回关系健康概览' })
  @ApiQuery({ name: 'forceRecompute', required: false, type: Boolean })
  @ApiQuery({ name: 'highRiskThreshold', required: false, type: Number })
  @ApiQuery({ name: 'mediumRiskThreshold', required: false, type: Number })
  @ApiQuery({ name: 'ruleWeight', required: false, type: Number })
  @ApiQuery({ name: 'llmWeight', required: false, type: Number })
  async getHealth(
    @Request() req: any,
    @Query('forceRecompute') forceRecompute?: string,
    @Query('highRiskThreshold') highRiskThreshold?: string,
    @Query('mediumRiskThreshold') mediumRiskThreshold?: string,
    @Query('ruleWeight') ruleWeight?: string,
    @Query('llmWeight') llmWeight?: string,
  ): Promise<RelationshipHealthSummaryResponse> {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }

    return this.relationshipsService.getHealthSummary(
      userId,
      forceRecompute === 'true',
      {
        highRiskThreshold: highRiskThreshold ? Number(highRiskThreshold) : undefined,
        mediumRiskThreshold: mediumRiskThreshold ? Number(mediumRiskThreshold) : undefined,
        ruleWeight: ruleWeight ? Number(ruleWeight) : undefined,
        llmWeight: llmWeight ? Number(llmWeight) : undefined,
      },
    );
  }

  @Get('risk-queue')
  @ApiOperation({
    summary: '获取关系风险队列',
    description: '返回高风险联系人队列与可解释因素。',
  })
  @ApiResponse({ status: 200, description: '返回关系风险队列' })
  @ApiQuery({ name: 'forceRecompute', required: false, type: Boolean })
  @ApiQuery({ name: 'highRiskThreshold', required: false, type: Number })
  @ApiQuery({ name: 'mediumRiskThreshold', required: false, type: Number })
  @ApiQuery({ name: 'ruleWeight', required: false, type: Number })
  @ApiQuery({ name: 'llmWeight', required: false, type: Number })
  async getRiskQueue(
    @Request() req: any,
    @Query('forceRecompute') forceRecompute?: string,
    @Query('highRiskThreshold') highRiskThreshold?: string,
    @Query('mediumRiskThreshold') mediumRiskThreshold?: string,
    @Query('ruleWeight') ruleWeight?: string,
    @Query('llmWeight') llmWeight?: string,
  ): Promise<RelationshipRiskQueueResponse> {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }

    return this.relationshipsService.getRiskQueue(
      userId,
      forceRecompute === 'true',
      {
        highRiskThreshold: highRiskThreshold ? Number(highRiskThreshold) : undefined,
        mediumRiskThreshold: mediumRiskThreshold ? Number(mediumRiskThreshold) : undefined,
        ruleWeight: ruleWeight ? Number(ruleWeight) : undefined,
        llmWeight: llmWeight ? Number(llmWeight) : undefined,
      },
    );
  }
}
