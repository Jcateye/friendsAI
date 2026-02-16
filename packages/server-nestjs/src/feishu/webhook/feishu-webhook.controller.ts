import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../../auth/public.decorator';
import { ButtonClickDto, ButtonClickErrorResponse, ButtonClickResponse } from './dto/button-click.dto';
import { MessageStatusDto, MessageStatusResponse } from './dto/message-status.dto';
import { FeishuWebhookService } from './feishu-webhook.service';

@ApiTags('feishu-webhook')
@Public()
@Controller(['feishu/webhook', 'webhooks/feishu'])
export class FeishuWebhookController {
  constructor(private readonly webhookService: FeishuWebhookService) {}

  @Post('button')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '接收飞书按钮回调并执行处理' })
  @ApiResponse({ status: 200, type: ButtonClickResponse })
  @ApiBadRequestResponse({ type: ButtonClickErrorResponse })
  @ApiUnauthorizedResponse({ type: ButtonClickErrorResponse })
  @ApiInternalServerErrorResponse({ type: ButtonClickErrorResponse })
  async handleButtonClick(
    @Body() dto: ButtonClickDto,
  ): Promise<ButtonClickResponse | ButtonClickErrorResponse> {
    return this.webhookService.handleButtonClick(dto);
  }

  @Post('message-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '接收飞书消息状态回流并更新 delivery 记录' })
  @ApiResponse({ status: 200, type: MessageStatusResponse })
  async handleMessageStatus(@Body() dto: MessageStatusDto): Promise<MessageStatusResponse> {
    return this.webhookService.handleMessageStatus(dto);
  }
}
