import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/current-user.decorator';
import { User } from '../../entities';
import { FeishuConfigService } from './feishu-config.service';
import { SaveConfigDto, FeishuConfigResponse } from './feishu-config.dto';

/**
 * 飞书配置管理控制器
 *
 * 提供配置保存和查询的 REST API
 */
@ApiTags('feishu-config')
@Controller('v1/feishu/config')
export class FeishuConfigController {
  constructor(private readonly configService: FeishuConfigService) {}

  /**
   * 获取用户配置
   *
   * GET /v1/feishu/config
   */
  @Get()
  @ApiOperation({ summary: '获取用户飞书配置' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '配置不存在' })
  async getConfig(@CurrentUser('id') userId: string): Promise<FeishuConfigResponse> {
    return this.configService.getConfig(userId);
  }

  /**
   * 保存用户配置
   *
   * POST /v1/feishu/config
   */
  @Post()
  @ApiOperation({ summary: '保存用户飞书配置' })
  @ApiResponse({ status: 200, description: '保存成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async saveConfig(
    @CurrentUser('id') userId: string,
    @Body() dto: SaveConfigDto,
  ): Promise<FeishuConfigResponse> {
    return this.configService.saveConfig(userId, dto);
  }
}
