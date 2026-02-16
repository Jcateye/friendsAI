import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import type { ReconcileResult } from './skill-loader.service';

@ApiTags('skills')
@ApiBearerAuth()
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get('catalog')
  @ApiOperation({ summary: '获取当前用户可见 skills catalog' })
  @ApiQuery({ name: 'agentScope', required: false, type: String })
  @ApiQuery({ name: 'capability', required: false, type: String })
  @ApiResponse({ status: 200, description: '返回动态技能清单' })
  async getCatalog(
    @Request() req: any,
    @Query('agentScope') agentScope?: string,
    @Query('capability') capability?: string,
  ) {
    const tenantId = req.user?.id;
    if (!tenantId) {
      throw new UnauthorizedException('User not found');
    }
    return this.skillsService.getCatalog(tenantId, {
      agentScope,
      capability,
    });
  }

  @Post()
  @ApiOperation({ summary: '创建 skill definition（global 或 tenant scope）' })
  @ApiResponse({ status: 201, description: 'skill definition created' })
  async createSkill(@Request() req: any, @Body() body: any) {
    const userId = req.user?.id ?? null;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.skillsService.createSkill(userId, userId, body);
  }

  @Post(':skillKey/versions')
  @ApiOperation({ summary: '创建 skill 版本' })
  @ApiParam({ name: 'skillKey', type: String })
  @ApiResponse({ status: 201, description: 'skill version created' })
  async createVersion(
    @Request() req: any,
    @Param('skillKey') skillKey: string,
    @Body() body: any,
  ) {
    const userId = req.user?.id ?? null;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.skillsService.createVersion(skillKey, userId, userId, body);
  }

  @Post(':skillKey/versions/:version/publish')
  @ApiOperation({ summary: '发布 skill 版本并配置灰度规则' })
  @ApiParam({ name: 'skillKey', type: String })
  @ApiParam({ name: 'version', type: String })
  @ApiResponse({ status: 200, description: 'publish result' })
  async publishVersion(
    @Request() req: any,
    @Param('skillKey') skillKey: string,
    @Param('version') version: string,
    @Body() body: any,
  ) {
    const userId = req.user?.id ?? null;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.skillsService.publishVersion(skillKey, version, userId, userId, body);
  }

  @Post('bindings/upsert')
  @ApiOperation({ summary: '租户/agent/capability 维度 upsert skill binding' })
  @ApiResponse({ status: 200, description: 'binding upserted' })
  async upsertBinding(@Request() req: any, @Body() body: any) {
    const userId = req.user?.id ?? null;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.skillsService.upsertBinding(userId, userId, body);
  }

  @Post('bindings/:id/disable')
  @ApiOperation({ summary: '停用 binding 并触发后续卸载计划' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'binding disabled' })
  async disableBinding(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id ?? null;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.skillsService.disableBinding(userId, userId, id);
  }

  @Post('runtime/reconcile')
  @ApiOperation({ summary: '重算并装载指定 tenant/agentScope 的 runtime skills' })
  @ApiResponse({ status: 200, description: 'reconcile result' })
  async reconcileRuntime(@Request() req: any, @Body() body: any): Promise<ReconcileResult> {
    const userId = req.user?.id ?? null;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.skillsService.reconcileRuntime(userId, userId, body);
  }

  @Post(['parse-debug', 'parse:debug'])
  @ApiOperation({ summary: '解析调试入口（开发/管理使用）' })
  @ApiResponse({ status: 200, description: 'parse result' })
  async parseDebug(@Request() req: any, @Body() body: any) {
    const userId = req.user?.id ?? null;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.skillsService.parseDebug(userId, userId, body);
  }

  @Get('runtime/mounts')
  @ApiOperation({ summary: '查看当前租户 runtime mount 状态' })
  async listRuntimeMounts(@Request() req: any) {
    const userId = req.user?.id ?? null;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.skillsService.listRuntimeMounts(userId);
  }
}
