import { Module } from '@nestjs/common';
import { ActionPanelService } from './action-panel/action-panel.service';
import { ActionPanelController } from './action-panel/action-panel.controller';

@Module({
  providers: [ActionPanelService],
  controllers: [ActionPanelController]
})
export class ActionPanelModule {}
