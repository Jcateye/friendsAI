import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionTrackingController } from './action-tracking.controller';
import { ActionTrackingService } from './action-tracking.service';
import { WeeklyReportService } from './weekly-report.service';
import { ActionOutcomeLog } from '../v3-entities/action-outcome-log.entity';
import { WeeklyReportCache } from '../v3-entities/weekly-report-cache.entity';

/**
 * Action Tracking Module
 * 
 * This module manages action tracking and weekly reporting features.
 * It uses a separate V3 data source (friendsai_v3_gpt database) for storing
 * action outcome logs and weekly report caches.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature(
      [
        ActionOutcomeLog,
        WeeklyReportCache,
      ],
      'v3', // 使用 V3 数据源
    ),
  ],
  controllers: [ActionTrackingController],
  providers: [ActionTrackingService, WeeklyReportService],
  exports: [ActionTrackingService],
})
export class ActionTrackingModule {}
