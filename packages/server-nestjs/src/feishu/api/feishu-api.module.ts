import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { FeishuApiService } from './feishu-api.service';

/**
 * 飞书 API 模块定义
 *
 * 提供飞书 OpenAPI 调用服务
 */
@Module({
  imports: [
    ConfigModule,
    HttpModule,
  ],
  providers: [FeishuApiService],
  exports: [FeishuApiService],
})
export class FeishuApiModule {}
