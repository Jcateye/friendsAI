import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeishuConfigController } from './feishu-config.controller';
import { FeishuConfigService } from './feishu-config.service';
import { FeishuConfig, FeishuWebhookLog } from '../entities/feishu-config.entity';

/**
 * 飞书配置管理模块
 *
 * 提供配置保存和查询的接口和实现
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([FeishuConfig, FeishuWebhookLog]),
  ],
  controllers: [FeishuConfigController],
  providers: [FeishuConfigService],
  exports: [FeishuConfigService],
})
export class FeishuConfigModule {}
