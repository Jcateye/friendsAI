import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { ToolRegistry } from './tool-registry';
import { VectorService } from './vector/vector.service';
import { ToolExecutionStrategy } from './tools/tool-execution.strategy';

@Module({
  providers: [AiService, ToolRegistry, VectorService, ToolExecutionStrategy],
  exports: [AiService, ToolRegistry, VectorService, ToolExecutionStrategy],
})
export class AiModule {}
