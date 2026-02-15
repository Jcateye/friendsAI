import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/current-user.decorator';
import { FeishuConfigResponse, SaveFeishuConfigDto } from './feishu-config.dto';
import { FeishuConfigService } from './feishu-config.service';

@ApiTags('feishu-config')
@ApiBearerAuth()
@Controller('feishu/config')
export class FeishuConfigController {
  constructor(private readonly configService: FeishuConfigService) {}

  @Get()
  @ApiOperation({ summary: '获取当前用户飞书配置' })
  @ApiResponse({ status: 200, type: FeishuConfigResponse })
  async getConfig(@CurrentUser('id') userId: string): Promise<FeishuConfigResponse> {
    return this.configService.getConfig(userId);
  }

  @Post()
  @ApiOperation({ summary: '保存当前用户飞书配置' })
  @ApiResponse({ status: 200, type: FeishuConfigResponse })
  async saveConfig(
    @CurrentUser('id') userId: string,
    @Body() dto: SaveFeishuConfigDto,
  ): Promise<FeishuConfigResponse> {
    return this.configService.saveConfig(userId, dto);
  }
}
