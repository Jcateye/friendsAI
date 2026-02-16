import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../entities';
import {
  DailyActionDigest,
  DailyActionDigestItem,
} from '../v3-entities';
import { NetworkActionService } from '../agent/capabilities/network_action/network-action.service';
import { ContactInsightService } from '../agent/capabilities/contact_insight/contact-insight.service';
import type { DailyActionDigestView, DailyActionDigestItemView } from './action-digest.types';

interface DigestCandidate {
  sourceRef: string | null;
  title: string;
  description: string;
  priorityScore: number;
  confidence: number | null;
  payload: Record<string, unknown>;
}

@Injectable()
export class ActionDigestService {
  private readonly logger = new Logger(ActionDigestService.name);
  private readonly enabled = process.env.DAILY_DIGEST_ENABLED !== 'false';

  constructor(
    @InjectRepository(DailyActionDigest, 'v3')
    private readonly digestRepo: Repository<DailyActionDigest>,
    @InjectRepository(DailyActionDigestItem, 'v3')
    private readonly digestItemRepo: Repository<DailyActionDigestItem>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    private readonly networkActionService: NetworkActionService,
    private readonly contactInsightService: ContactInsightService,
  ) {}

  async getTodayDigest(userId: string, forceRefresh = false): Promise<DailyActionDigestView> {
    const today = this.startOfDay(new Date());

    if (!this.enabled) {
      return {
        date: today.toISOString().slice(0, 10),
        generatedAt: new Date().toISOString(),
        items: [],
      };
    }

    const existingDigest = await this.digestRepo.findOne({
      where: {
        userId,
        digestDate: today,
      },
    });

    if (existingDigest && !forceRefresh) {
      const items = await this.digestItemRepo.find({
        where: {
          digestId: existingDigest.id,
        },
        order: {
          rank: 'ASC',
        },
      });
      return this.toView(existingDigest, items);
    }

    const candidates = await this.buildCandidates(userId);
    const top = candidates
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 3);

    const digest = existingDigest
      ? Object.assign(existingDigest, {
          generatedAt: new Date(),
          metadata: {
            itemCount: top.length,
          },
        })
      : this.digestRepo.create({
          userId,
          digestDate: today,
          generatedAt: new Date(),
          metadata: {
            itemCount: top.length,
          },
        });

    const savedDigest = await this.digestRepo.save(digest);

    if (existingDigest) {
      await this.digestItemRepo.delete({ digestId: savedDigest.id });
    }

    const rows = top.map((candidate, index) =>
      this.digestItemRepo.create({
        digestId: savedDigest.id,
        rank: index + 1,
        actionType: 'followup',
        sourceAgentId: 'network_action',
        sourceRef: candidate.sourceRef,
        title: candidate.title,
        description: candidate.description,
        priorityScore: Number(candidate.priorityScore.toFixed(2)),
        confidence: candidate.confidence,
        payload: candidate.payload,
      }),
    );

    const savedItems = rows.length > 0 ? await this.digestItemRepo.save(rows) : [];
    return this.toView(savedDigest, savedItems);
  }

  private async buildCandidates(userId: string): Promise<DigestCandidate[]> {
    const network = await this.networkActionService.run({ userId, forceRefresh: false, limit: 10 });
    const contacts = await this.contactRepo.find({
      where: { userId },
      select: ['id'],
      take: 10,
    });

    const insightByContact = new Map<string, { score: number; summary?: string }>();

    for (const contact of contacts.slice(0, 5)) {
      try {
        const insight = await this.contactInsightService.generate(
          {
            userId,
            contactId: contact.id,
            depth: 'brief',
          },
          {
            forceRefresh: false,
          },
        );

        const insightScore =
          typeof (insight as any).priority_score === 'number'
            ? Number((insight as any).priority_score)
            : typeof (insight as any).priorityScore === 'number'
              ? Number((insight as any).priorityScore)
              : null;

        const score = insightScore ?? 60;

        insightByContact.set(contact.id, {
          score,
          summary: insight.profileSummary,
        });
      } catch (error) {
        this.logger.debug(
          `Skip insight candidate for contact=${contact.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const candidates: DigestCandidate[] = [];

    for (const followUp of network.followUps) {
      const base = this.priorityToScore(followUp.priority);
      const insight = insightByContact.get(followUp.contactId);
      const merged = insight ? (base * 0.6 + insight.score * 0.4) : base;

      candidates.push({
        sourceRef: followUp.contactId,
        title: `跟进 ${followUp.contactName}`,
        description: `${followUp.reason}。建议：${followUp.suggestedAction}`,
        priorityScore: merged,
        confidence: 0.75,
        payload: {
          followUp,
          insightSummary: insight?.summary ?? null,
        },
      });
    }

    if (candidates.length === 0) {
      for (const next of network.nextActions.slice(0, 3)) {
        candidates.push({
          sourceRef: null,
          title: next.action,
          description: network.synthesis,
          priorityScore: this.priorityToScore(next.priority),
          confidence: 0.65,
          payload: {
            nextAction: next,
          },
        });
      }
    }

    return candidates;
  }

  private toView(digest: DailyActionDigest, items: DailyActionDigestItem[]): DailyActionDigestView {
    return {
      date: digest.digestDate.toISOString().slice(0, 10),
      generatedAt: digest.generatedAt.toISOString(),
      items: items.map((item): DailyActionDigestItemView => ({
        id: item.id,
        rank: item.rank,
        actionType: item.actionType,
        sourceAgentId: item.sourceAgentId,
        sourceRef: item.sourceRef,
        title: item.title,
        description: item.description,
        priorityScore: Number(item.priorityScore),
        confidence: item.confidence === null ? null : Number(item.confidence),
        payload: item.payload,
      })),
    };
  }

  private priorityToScore(priority: 'high' | 'medium' | 'low'): number {
    if (priority === 'high') {
      return 90;
    }
    if (priority === 'medium') {
      return 70;
    }
    return 50;
  }

  private startOfDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
}
