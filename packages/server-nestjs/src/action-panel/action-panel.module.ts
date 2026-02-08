import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { AgentModule } from '../agent/agent.module';
import { ActionPanelService } from './action-panel/action-panel.service';
import { ActionPanelController } from './action-panel/action-panel.controller';
import { Contact, Conversation, Event } from '../entities';

@Module({
  imports: [
    AiModule,
    AgentModule,
    TypeOrmModule.forFeature([Contact, Conversation, Event])
  ],
  providers: [ActionPanelService],
  controllers: [ActionPanelController]
})
export class ActionPanelModule {}
