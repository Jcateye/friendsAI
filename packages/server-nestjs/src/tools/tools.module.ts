import { Module } from '@nestjs/common';
import { ToolRegistry } from './tool-registry.service';
import { FeishuClient } from './feishu/feishu.client';
import { FeishuTool } from './feishu/feishu.tool';

@Module({
  providers: [ToolRegistry, FeishuClient, FeishuTool],
  exports: [ToolRegistry, FeishuClient],
})
export class ToolsModule {}
