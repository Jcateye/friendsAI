import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ToolConfirmationsController } from './tool-confirmations.controller';
import { ToolConfirmationsService } from './tool-confirmations.service';
import { ToolConfirmation } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([ToolConfirmation])],
  controllers: [ToolConfirmationsController],
  providers: [ToolConfirmationsService],
  exports: [ToolConfirmationsService],
})
export class ToolConfirmationsModule {}
