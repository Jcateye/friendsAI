import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AgentController } from './agent.controller';
import { AgentOrchestrator } from './agent.orchestrator';

@Module({
  imports: [AiModule],
  controllers: [AgentController],
  providers: [AgentOrchestrator],
})
export class AgentModule {}
