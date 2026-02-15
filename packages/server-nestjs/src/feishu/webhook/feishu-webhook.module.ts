import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeishuApiModule } from '../api/feishu-api.module';
import { FeishuWebhookLog } from '../entities/feishu-config.entity';
import { FeishuWebhookController } from './feishu-webhook.controller';
import { FeishuWebhookService } from './feishu-webhook.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([FeishuWebhookLog]), FeishuApiModule],
  controllers: [FeishuWebhookController],
  providers: [FeishuWebhookService],
  exports: [FeishuWebhookService],
})
export class FeishuWebhookModule {}
