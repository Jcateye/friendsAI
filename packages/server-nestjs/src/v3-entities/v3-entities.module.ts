import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RelationshipHealthSnapshot } from './relationship-health-snapshot.entity';
import { RelationshipDebtItem } from './relationship-debt-item.entity';
import { ActionOutcomeLog } from './action-outcome-log.entity';
import { WeeklyReportCache } from './weekly-report-cache.entity';
import { FeishuToken } from './feishu-token.entity';
import { AgentRunMetric } from './agent-run-metric.entity';
import { DailyActionDigest } from './daily-action-digest.entity';
import { DailyActionDigestItem } from './daily-action-digest-item.entity';
import { FeishuMessageTemplate } from './feishu-message-template.entity';
import { FeishuMessageDelivery } from './feishu-message-delivery.entity';
import { AgentDefinitionVersion } from './agent-definition-version.entity';
import { AgentDefinitionReleaseRule } from './agent-definition-release-rule.entity';
import { AgentDefinitionPublishLog } from './agent-definition-publish-log.entity';
import { SkillDefinition } from './skill-definition.entity';
import { SkillVersion } from './skill-version.entity';
import { SkillReleaseRule } from './skill-release-rule.entity';
import { SkillBinding } from './skill-binding.entity';
import { SkillRuntimeMount } from './skill-runtime-mount.entity';
import { SkillInvocationLog } from './skill-invocation-log.entity';
import { SkillPublishLog } from './skill-publish-log.entity';

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
        AgentRunMetric,
        DailyActionDigest,
        DailyActionDigestItem,
        FeishuMessageTemplate,
        FeishuMessageDelivery,
        AgentDefinitionVersion,
        AgentDefinitionReleaseRule,
        AgentDefinitionPublishLog,
        SkillDefinition,
        SkillVersion,
        SkillReleaseRule,
        SkillBinding,
        SkillRuntimeMount,
        SkillInvocationLog,
        SkillPublishLog,
      ],
      'v3',
    ),
  ],
  exports: [
    TypeOrmModule,
  ],
})
export class V3EntitiesModule {}
