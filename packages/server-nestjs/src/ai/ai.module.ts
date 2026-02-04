import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { ToolRegistry } from './tool-registry';
import { VectorService } from './vector/vector.service';

@Module({
  providers: [AiService, ToolRegistry, VectorService],
  exports: [AiService, ToolRegistry, VectorService],
})
export class AiModule {}
