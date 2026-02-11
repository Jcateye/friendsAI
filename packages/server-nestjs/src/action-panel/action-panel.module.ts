import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionPanelService } from './action-panel/action-panel.service';
import { ActionPanelController } from './action-panel/action-panel.controller';
import { Contact, Conversation, Event } from '../entities';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule, TypeOrmModule.forFeature([Contact, Conversation, Event])],
  providers: [ActionPanelService],
  controllers: [ActionPanelController],
})
export class ActionPanelModule {}
