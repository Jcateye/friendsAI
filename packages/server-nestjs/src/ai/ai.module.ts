import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { ToolRegistry } from './tool-registry';
import { VectorService } from './vector/vector.service';
import { ToolExecutionStrategy } from './tools/tool-execution.strategy';
import { Conversation, Event } from '../entities';
import { ToolConfirmationsModule } from '../tool-confirmations/tool-confirmations.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Event]), ToolConfirmationsModule],
  providers: [AiService, ToolRegistry, VectorService, ToolExecutionStrategy],
  exports: [AiService, ToolRegistry, VectorService, ToolExecutionStrategy],
})
export class AiModule {}
