import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { ActionPanelController } from './action-panel/action-panel.controller';

@Module({
  imports: [AgentModule],
  controllers: [ActionPanelController],
})
export class ActionPanelModule {}
