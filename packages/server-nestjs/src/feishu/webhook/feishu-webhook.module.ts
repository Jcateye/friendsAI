import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FeishuWebhookController } from './feishu-webhook.controller';
import { FeishuWebhookService } from './feishu-webhook.service';
import { FeishuApiService } from '../api/feishu-api.service';

/**
 * 飞书 Webhook 模块定义
 *
 * 包含 Webhook 相关的控制器和服务提供者
 */
@Module({
  imports: [ConfigModule],
  controllers: [FeishuWebhookController],
  providers: [FeishuWebhookService, FeishuApiService],
  exports: [FeishuWebhookService],
})
export class FeishuWebhookModule {}
