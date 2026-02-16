import { Module } from '@nestjs/common';
import { ToolsModule } from '../../tools/tools.module';
import { FeishuApiService } from './feishu-api.service';

@Module({
  imports: [ToolsModule],
  providers: [FeishuApiService],
  exports: [FeishuApiService],
})
export class FeishuApiModule {}
