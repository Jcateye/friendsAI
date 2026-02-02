import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionPanelService } from './action-panel/action-panel.service';
import { ActionPanelController } from './action-panel/action-panel.controller';
import { AiModule } from '../ai/ai.module';
import { Contact, Conversation, Event } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Conversation, Event]), AiModule],
  providers: [ActionPanelService],
  controllers: [ActionPanelController],
})
export class ActionPanelModule {}
