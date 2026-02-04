import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { User, Contact, Conversation, ConnectorToken } from '../entities';
import { ToolExecutionStrategy } from '../ai/tools/tool-execution.strategy';
import { AgentController } from './agent.controller';
import { AgentOrchestrator } from './agent.orchestrator';
import { ContextBuilderService } from './context-builder.service';

@Module({
  imports: [
    AiModule,
    TypeOrmModule.forFeature([User, Contact, Conversation, ConnectorToken]),
  ],
  controllers: [AgentController],
  providers: [
    AgentOrchestrator,
    ContextBuilderService,
    ToolExecutionStrategy,
  ],
  exports: [AgentOrchestrator, ContextBuilderService],
})
export class AgentModule {}
