import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { User, Contact, Conversation, ConnectorToken } from '../entities';
import { ToolExecutionStrategy } from '../ai/tools/tool-execution.strategy';
import { AgentController } from './agent.controller';
import { AgentOrchestrator } from './agent.orchestrator';
import { ContextBuilderService } from './context-builder.service';
import { ContextBuilder } from './context-builder';

@Module({
  imports: [
    AiModule,
    TypeOrmModule.forFeature([User, Contact, Conversation, ConnectorToken]),
  ],
  controllers: [AgentController],
  providers: [
    AgentOrchestrator,
    ContextBuilder,
    ContextBuilderService,
    ToolExecutionStrategy,
  ],
  exports: [AgentOrchestrator, ContextBuilderService, ContextBuilder],
})
export class AgentModule {}
