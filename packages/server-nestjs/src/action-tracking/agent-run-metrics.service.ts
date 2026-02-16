import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  AgentRunMetric,
  type AgentRunMetricEndpoint,
  type AgentRunMetricStatus,
} from '../v3-entities/agent-run-metric.entity';
import type { AgentMetricsSummary, AgentMetricsByAgentItem } from './action-tracking.types';

export interface RecordAgentRunMetricInput {
  runId: string;
  userId?: string | null;
  agentId: string;
  operation?: string | null;
  endpoint: AgentRunMetricEndpoint;
  status: AgentRunMetricStatus;
  cached?: boolean;
  durationMs: number;
  errorCode?: string | null;
}

@Injectable()
export class AgentRunMetricsService {
  private readonly logger = new Logger(AgentRunMetricsService.name);
  private readonly enabled = process.env.AGENT_METRICS_ENABLED !== 'false';

  constructor(
    @InjectRepository(AgentRunMetric, 'v3')
    private readonly metricRepo: Repository<AgentRunMetric>,
  ) {}

  async recordRun(input: RecordAgentRunMetricInput): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const entity = this.metricRepo.create({
        runId: input.runId,
        userId: input.userId ?? null,
        agentId: input.agentId,
        operation: input.operation ?? null,
        endpoint: input.endpoint,
        status: input.status,
        cached: Boolean(input.cached),
        durationMs: Math.max(0, Math.round(input.durationMs)),
        errorCode: input.errorCode ?? null,
      });
      await this.metricRepo.save(entity);
    } catch (error) {
      this.logger.warn(
        `Failed to record agent metric: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getMetrics(userId: string, days = 7): Promise<AgentMetricsSummary> {
    const now = Date.now();
    const daysToUse = Number.isFinite(days) && days > 0 ? Math.floor(days) : 7;
    const start = new Date(now - daysToUse * 24 * 60 * 60 * 1000);
    const end = new Date(now);

    const rows = await this.metricRepo.find({
      where: {
        userId,
        createdAt: Between(start, end),
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return this.buildSummary(rows);
  }

  private buildSummary(rows: AgentRunMetric[]): AgentMetricsSummary {
    const totalRuns = rows.length;
    const succeeded = rows.filter((row) => row.status === 'succeeded').length;
    const cacheHits = rows.filter((row) => row.cached).length;
    const validationFails = rows.filter((row) => row.errorCode === 'output_validation_failed').length;
    const durationSum = rows.reduce((sum, row) => sum + row.durationMs, 0);
    const avgDurationMs = totalRuns > 0 ? Math.round(durationSum / totalRuns) : 0;

    const byAgentMap = new Map<string, AgentRunMetric[]>();
    for (const row of rows) {
      const list = byAgentMap.get(row.agentId) ?? [];
      list.push(row);
      byAgentMap.set(row.agentId, list);
    }

    const byAgent: AgentMetricsByAgentItem[] = Array.from(byAgentMap.entries())
      .map(([agentId, metrics]) => {
        const agentTotal = metrics.length;
        const agentSucceeded = metrics.filter((m) => m.status === 'succeeded').length;
        const agentCacheHits = metrics.filter((m) => m.cached).length;
        const agentValidationFails = metrics.filter((m) => m.errorCode === 'output_validation_failed').length;
        const agentDuration = metrics.reduce((sum, item) => sum + item.durationMs, 0);

        return {
          agentId,
          totalRuns: agentTotal,
          successRate: this.toPercent(agentSucceeded, agentTotal),
          cacheHitRate: this.toPercent(agentCacheHits, agentTotal),
          validationFailRate: this.toPercent(agentValidationFails, agentTotal),
          avgDurationMs: agentTotal > 0 ? Math.round(agentDuration / agentTotal) : 0,
        };
      })
      .sort((a, b) => b.totalRuns - a.totalRuns);

    return {
      totalRuns,
      successRate: this.toPercent(succeeded, totalRuns),
      cacheHitRate: this.toPercent(cacheHits, totalRuns),
      validationFailRate: this.toPercent(validationFails, totalRuns),
      avgDurationMs,
      byAgent,
    };
  }

  private toPercent(part: number, total: number): number {
    if (total <= 0) {
      return 0;
    }
    return Number(((part / total) * 100).toFixed(2));
  }
}
