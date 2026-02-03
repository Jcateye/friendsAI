import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { VectorService } from './vector/vector.service';
import { ToolExecutionStrategy } from './tools/tool-execution.strategy';

@Module({
  providers: [AiService, VectorService, ToolExecutionStrategy],
  exports: [AiService, VectorService, ToolExecutionStrategy],
})
export class AiModule {}
