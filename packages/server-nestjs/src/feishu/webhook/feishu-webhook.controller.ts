import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse, ApiUnauthorizedResponse, ApiInternalServerErrorResponse } from '@nestjs/swagger';
import { Public } from '../../auth/public.decorator';
import { ButtonClickDto, ButtonClickResponse, ButtonClickErrorResponse } from './dto/button-click.dto';
import { FeishuWebhookService } from './feishu-webhook.service';

/**
 * 飞书按钮 Webhook 接收控制器
 *
 * 接收来自飞书 Automation 的按钮点击回调
 */
@ApiTags('feishu')
@Public()
@Controller('feishu/webhook')
export class FeishuWebhookController {
  private readonly logger = new Logger(FeishuWebhookController.name);

  constructor(private readonly webhookService: FeishuWebhookService) {}

  /**
   * 接收按钮点击回调
   *
   * POST /feishu/webhook/button
   *
   * 飞书 Automation 在用户点击按钮后调用此端点
   */
  @Post('button')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '接收飞书按钮点击回调',
    description: '接收来自飞书 Automation 的按钮点击事件，处理签名验证后执行业务逻辑',
  })
  @ApiResponse({
    status: 200,
    description: '处理成功',
    type: ButtonClickResponse,
  })
  @ApiBadRequestResponse({
    description: '请求参数错误',
    type: ButtonClickErrorResponse,
  })
  @ApiUnauthorizedResponse({
    description: '签名验证失败',
    type: ButtonClickErrorResponse,
  })
  @ApiInternalServerErrorResponse({
    description: '服务器内部错误',
    type: ButtonClickErrorResponse,
  })
  async handleButtonClick(
    @Body() dto: ButtonClickDto,
  ): Promise<ButtonClickResponse | ButtonClickErrorResponse> {
    this.logger.log(`收到按钮点击请求: userId=${dto.userId}, buttonId=${dto.buttonId}, recordId=${dto.recordId}`);
    return this.webhookService.handleButtonClick(dto);
  }
}
