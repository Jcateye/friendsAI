import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AgentDefinitionCenterService } from './agent-definition-center.service';

@ApiTags('agent-definition-center')
@ApiBearerAuth()
@Controller('agent/definitions')
export class AgentDefinitionCenterController {
  constructor(private readonly centerService: AgentDefinitionCenterService) {}

  @Get(':agentId/versions')
  @ApiOperation({ summary: '查询 Agent 定义版本列表' })
  @ApiParam({ name: 'agentId', type: String })
  @ApiResponse({ status: 200, description: '返回版本列表' })
  listVersions(@Param('agentId') agentId: string) {
    return this.centerService.listVersions(agentId);
  }

  @Post(':agentId/versions')
  @ApiOperation({ summary: '创建 Agent 定义版本' })
  @ApiResponse({ status: 201, description: '创建成功' })
  createVersion(@Request() req: any, @Param('agentId') agentId: string, @Body() body: any) {
    const userId = req.user?.id ?? null;
    return this.centerService.createVersion(agentId, userId, body);
  }

  @Post(':agentId/validate')
  @ApiOperation({ summary: '发布前校验 Agent 定义' })
  @ApiResponse({ status: 200, description: '返回校验结果' })
  validate(@Param('agentId') _agentId: string, @Body() body: any) {
    return this.centerService.validateDefinition(body);
  }

  @Post(':agentId/versions/:version/publish')
  @ApiOperation({ summary: '发布 Agent 定义版本' })
  @ApiResponse({ status: 200, description: '发布结果' })
  publishVersion(
    @Request() req: any,
    @Param('agentId') agentId: string,
    @Param('version') version: string,
    @Body() body: { rolloutPercent?: number },
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.centerService.publishVersion(agentId, version, userId, body);
  }
}
