import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeishuConfig } from '../entities/feishu-config.entity';
import { FeishuConfigController } from './feishu-config.controller';
import { FeishuConfigService } from './feishu-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([FeishuConfig])],
  controllers: [FeishuConfigController],
  providers: [FeishuConfigService],
  exports: [FeishuConfigService],
})
export class FeishuConfigModule {}
