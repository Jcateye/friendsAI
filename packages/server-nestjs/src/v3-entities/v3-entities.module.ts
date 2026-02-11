import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RelationshipHealthSnapshot } from './relationship-health-snapshot.entity';
import { RelationshipDebtItem } from './relationship-debt-item.entity';
import { ActionOutcomeLog } from './action-outcome-log.entity';
import { WeeklyReportCache } from './weekly-report-cache.entity';
import { FeishuToken } from './feishu-token.entity';

/**
 * V3 实体模块
 *
 * 提供对 V3 版本实体的 TypeORM repository 访问
 * 所有实体使用 'v3' 数据源连接
 */
@Module({
  imports: [
    TypeOrmModule.forFeature(
      [
        RelationshipHealthSnapshot,
        RelationshipDebtItem,
        ActionOutcomeLog,
        WeeklyReportCache,
        FeishuToken,
      ],
      'v3',
    ),
  ],
  exports: [
    TypeOrmModule,
  ],
})
export class V3EntitiesModule {}
