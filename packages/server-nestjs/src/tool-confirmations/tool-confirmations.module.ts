import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ToolConfirmationsController } from './tool-confirmations.controller';
import { ToolConfirmationsService } from './tool-confirmations.service';
import { ToolConfirmation } from '../entities';
import { ToolsModule } from '../tools/tools.module';
import { ActionTrackingModule } from '../action-tracking/action-tracking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ToolConfirmation]),
    ToolsModule,
    ActionTrackingModule,
  ],
  controllers: [ToolConfirmationsController],
  providers: [ToolConfirmationsService],
  exports: [ToolConfirmationsService],
})
export class ToolConfirmationsModule {}
