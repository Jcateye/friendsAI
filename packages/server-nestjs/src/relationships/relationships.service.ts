import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../entities';
import { RelationshipDebtItem, RelationshipHealthSnapshot } from '../v3-entities';
import type {
  RelationshipFactor,
  RelationshipHealthSummaryResponse,
  RelationshipRiskQueueItem,
  RelationshipRiskQueueResponse,
  RelationshipThresholdOptions,
} from './relationships.types';

interface ComputedHealth {
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: RelationshipFactor[];
  priorityScore: number;
  tags: string[];
}

@Injectable()
export class RelationshipsService {
  private readonly logger = new Logger(RelationshipsService.name);
  private readonly enabled = process.env.RELATIONSHIP_HEALTH_ENABLED !== 'false';

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(RelationshipHealthSnapshot, 'v3')
    private readonly healthRepo: Repository<RelationshipHealthSnapshot>,
    @InjectRepository(RelationshipDebtItem, 'v3')
    private readonly debtRepo: Repository<RelationshipDebtItem>,
  ) {}

  async getHealthSummary(
    userId: string,
    forceRecompute = false,
    options: RelationshipThresholdOptions = {},
  ): Promise<RelationshipHealthSummaryResponse> {
    if (!this.enabled) {
      return {
        averageScore: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        totalContacts: 0,
        generatedAt: new Date().toISOString(),
      };
    }

    const today = this.startOfDay(new Date());

    if (forceRecompute) {
      await this.recomputeSnapshots(userId, options, today);
    }

    const snapshots = await this.healthRepo.find({
      where: {
        userId,
        snapshotDate: today,
      },
    });

    if (snapshots.length === 0) {
      return {
        averageScore: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        totalContacts: 0,
        generatedAt: new Date().toISOString(),
      };
    }

    const total = snapshots.length;
    const avg = snapshots.reduce((sum, item) => sum + Number(item.healthScore ?? 0), 0) / total;

    const highRiskCount = snapshots.filter((item) => item.riskLevel === 'high').length;
    const mediumRiskCount = snapshots.filter((item) => item.riskLevel === 'medium').length;
    const lowRiskCount = snapshots.filter((item) => item.riskLevel === 'low').length;

    return {
      averageScore: Number(avg.toFixed(2)),
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      totalContacts: total,
      generatedAt: new Date().toISOString(),
    };
  }

  async getRiskQueue(
    userId: string,
    forceRecompute = false,
    options: RelationshipThresholdOptions = {},
  ): Promise<RelationshipRiskQueueResponse> {
    if (!this.enabled) {
      return {
        generatedAt: new Date().toISOString(),
        items: [],
      };
    }

    const today = this.startOfDay(new Date());

    if (forceRecompute) {
      await this.recomputeSnapshots(userId, options, today);
    }

    const [snapshots, contacts] = await Promise.all([
      this.healthRepo.find({
        where: {
          userId,
          snapshotDate: today,
        },
        order: {
          healthScore: 'ASC',
        },
        take: 50,
      }),
      this.contactRepo.find({
        where: { userId },
      }),
    ]);

    const contactNameMap = new Map(contacts.map((contact) => [contact.id, contact.name]));

    const items: RelationshipRiskQueueItem[] = snapshots
      .map((snapshot) => {
        const metadata = (snapshot.metadata ?? {}) as { factors?: RelationshipFactor[]; suggestedAction?: string };
        return {
          contactId: snapshot.contactId,
          contactName: contactNameMap.get(snapshot.contactId) ?? snapshot.contactId,
          score: Number(snapshot.healthScore ?? 0),
          riskLevel: snapshot.riskLevel ?? 'medium',
          suggestedAction:
            metadata.suggestedAction ??
            (snapshot.riskLevel === 'high' ? '72小时内主动联系并提供明确价值。' : '本周安排一次轻量跟进。'),
          factors: metadata.factors ?? [],
        };
      })
      .sort((a, b) => a.score - b.score);

    return {
      generatedAt: new Date().toISOString(),
      items,
    };
  }

  private async recomputeSnapshots(
    userId: string,
    options: RelationshipThresholdOptions,
    snapshotDate: Date,
  ): Promise<void> {
    const contacts = await this.contactRepo.find({
      where: { userId },
      take: 200,
      order: { updatedAt: 'DESC' },
    });

    const debts = await this.debtRepo.find({
      where: {
        userId,
      },
    });

    const debtByContact = new Map<string, RelationshipDebtItem[]>();
    for (const debt of debts) {
      const list = debtByContact.get(debt.contactId) ?? [];
      list.push(debt);
      debtByContact.set(debt.contactId, list);
    }

    for (const contact of contacts) {
      const computed = this.computeHealth(contact, debtByContact.get(contact.id) ?? [], options);

      const existing = await this.healthRepo.findOne({
        where: {
          userId,
          contactId: contact.id,
          snapshotDate,
        },
      });

      const next = existing
        ? Object.assign(existing, {
            healthScore: computed.score,
            riskLevel: computed.riskLevel,
            lastInteractionAt: contact.updatedAt,
            interactionFrequencyDays: Math.max(1, Math.floor(this.daysSince(contact.createdAt) / 5)),
            totalInteractions: 0,
            insightTags: computed.tags,
            priorityScore: computed.priorityScore,
            relationshipRiskLevel: computed.riskLevel === 'high' ? 'critical' : computed.riskLevel === 'medium' ? 'declining' : 'stable',
            metadata: {
              factors: computed.factors,
              suggestedAction: computed.riskLevel === 'high' ? '优先修复关系风险并安排直接沟通。' : '维持节奏并持续提供价值。',
            },
          })
        : this.healthRepo.create({
            userId,
            contactId: contact.id,
            snapshotDate,
            healthScore: computed.score,
            riskLevel: computed.riskLevel,
            lastInteractionAt: contact.updatedAt,
            interactionFrequencyDays: Math.max(1, Math.floor(this.daysSince(contact.createdAt) / 5)),
            totalInteractions: 0,
            insightTags: computed.tags,
            priorityScore: computed.priorityScore,
            relationshipRiskLevel: computed.riskLevel === 'high' ? 'critical' : computed.riskLevel === 'medium' ? 'declining' : 'stable',
            metadata: {
              factors: computed.factors,
              suggestedAction: computed.riskLevel === 'high' ? '优先修复关系风险并安排直接沟通。' : '维持节奏并持续提供价值。',
            },
            createdAt: new Date(),
          });

      await this.healthRepo.save(next);
    }

    this.logger.debug(`Recomputed relationship health snapshots for user=${userId}, contacts=${contacts.length}`);
  }

  private computeHealth(
    contact: Contact,
    debts: RelationshipDebtItem[],
    options: RelationshipThresholdOptions,
  ): ComputedHealth {
    const days = this.daysSince(contact.updatedAt);
    const recencyScore = Math.max(0, 100 - days * 2);

    const pendingDebts = debts.filter((debt) => debt.status === 'pending' || debt.status === 'in_progress');
    const debtPenalty = pendingDebts.reduce((sum, debt) => sum + this.severityPenalty(debt.severity), 0);

    const ruleScore = Math.max(0, Math.min(100, recencyScore - debtPenalty));
    const llmScore = Math.max(0, Math.min(100, 100 - pendingDebts.length * 15 - days * 0.8));

    const ruleWeight = Number.isFinite(options.ruleWeight) ? Number(options.ruleWeight) : 0.7;
    const llmWeight = Number.isFinite(options.llmWeight) ? Number(options.llmWeight) : 0.3;
    const normalized = ruleWeight + llmWeight > 0 ? ruleWeight + llmWeight : 1;

    const finalScore = (ruleScore * ruleWeight + llmScore * llmWeight) / normalized;

    const high = Number.isFinite(options.highRiskThreshold) ? Number(options.highRiskThreshold) : 40;
    const medium = Number.isFinite(options.mediumRiskThreshold) ? Number(options.mediumRiskThreshold) : 70;

    const riskLevel: 'low' | 'medium' | 'high' =
      finalScore < high ? 'high' : finalScore < medium ? 'medium' : 'low';

    const factors: RelationshipFactor[] = [
      {
        key: 'recency_days',
        weight: 0.45,
        value: days,
        reason: `距最近互动约 ${days} 天`,
      },
      {
        key: 'pending_debt_count',
        weight: 0.35,
        value: pendingDebts.length,
        reason: `待处理关系债务 ${pendingDebts.length} 条`,
      },
      {
        key: 'debt_penalty',
        weight: 0.2,
        value: debtPenalty,
        reason: `债务惩罚分 ${debtPenalty.toFixed(2)}`,
      },
    ];

    const tags = [
      days > 30 ? 'long_time_no_contact' : 'recent_contact',
      pendingDebts.length > 0 ? 'pending_relationship_debt' : 'debt_clear',
      riskLevel === 'high' ? 'high_risk' : riskLevel === 'medium' ? 'medium_risk' : 'low_risk',
    ];

    return {
      score: Number(finalScore.toFixed(2)),
      riskLevel,
      factors,
      priorityScore: Number((100 - finalScore).toFixed(2)),
      tags,
    };
  }

  private severityPenalty(severity: string): number {
    if (severity === 'critical') {
      return 30;
    }
    if (severity === 'high') {
      return 20;
    }
    if (severity === 'medium') {
      return 10;
    }
    return 5;
  }

  private daysSince(date: Date): number {
    const diff = Date.now() - date.getTime();
    return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
  }

  private startOfDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
}
