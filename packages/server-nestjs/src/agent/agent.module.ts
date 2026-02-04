import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ToolExecutionStrategy } from '../ai/tools/tool-execution.strategy';
import { AgentController } from './agent.controller';
import { AgentOrchestrator } from './agent.orchestrator';
import { ContextBuilder } from './context-builder';

@Module({
  imports: [AiModule],
  controllers: [AgentController],
  providers: [
    AgentOrchestrator,
    ContextBuilder,
    ToolExecutionStrategy,
  ],
  exports: [AgentOrchestrator, ContextBuilder],
})
export class AgentModule {}
