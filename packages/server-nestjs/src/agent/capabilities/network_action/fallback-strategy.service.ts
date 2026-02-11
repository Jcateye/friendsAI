/**
 * Fallback Strategy Service
 *
 * Provides fallback responses when data is insufficient.
 * Prevents AI from generating unreliable recommendations.
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  NetworkActionInput,
  NetworkActionOutput,
} from './network-action.types';
import type {
  DataAvailabilityReport,
  DataQuality,
} from './data-availability-validator';

/**
 * Evidence annotation for data limitations
 */
export interface DataLimitationEvidence {
  type: 'data_limitation' | 'recency' | 'coverage';
  source: 'system';
  reference: string;
}

/**
 * Fallback response configuration
 */
export interface FallbackConfig {
  /** Maximum confidence for low quality data */
  maxLowQualityConfidence: number;
  /** Maximum confidence for medium quality data */
  maxMediumQualityConfidence: number;
  /** Whether to require confirmation for low quality data */
  requireConfirmationForLow: boolean;
  /** Whether to require confirmation for medium quality data */
  requireConfirmationForMedium: boolean;
}

/**
 * Default fallback configuration
 */
const DEFAULT_CONFIG: FallbackConfig = {
  maxLowQualityConfidence: 0.3,
  maxMediumQualityConfidence: 0.6,
  requireConfirmationForLow: true,
  requireConfirmationForMedium: false,
};

/**
 * Fallback Strategy Service
 *
 * Generates appropriate fallback responses based on data availability.
 */
@Injectable()
export class FallbackStrategyService {
  private readonly logger = new Logger(FallbackStrategyService.name);
  private readonly config: FallbackConfig;

  constructor(config?: Partial<FallbackConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Determine if fallback should be used
   */
  shouldUseFallback(dataReport: DataAvailabilityReport): boolean {
    return dataReport.dataQuality === 'low';
  }

  /**
   * Generate a fallback response when data is insufficient
   */
  generateFallbackResponse(
    input: NetworkActionInput,
    dataReport: DataAvailabilityReport,
  ): Partial<NetworkActionOutput> {
    const { metrics, missingFields, dataQuality } = dataReport;

    this.logger.debug(
      `Generating fallback response for data quality: ${dataQuality}, ` +
        `missing: ${missingFields.join(', ')}`,
    );

    // Build synthesis message based on data situation
    const synthesis = this.buildSynthesis(dataQuality, metrics, missingFields);

    // Build next actions
    const nextActions = this.buildNextActions(dataQuality, missingFields);

    // Build empty follow-ups with data limitation notes
    const followUps = this.buildFollowUps(dataQuality, metrics);

    // Build recommendations with confidence adjustments
    const recommendations = this.buildRecommendations(dataQuality, metrics);

    return {
      followUps,
      recommendations,
      synthesis,
      nextActions,
      queues: this.buildQueues(dataQuality),
      weeklyPlan: [],
    };
  }

  /**
   * Adjust confidence based on data availability
   */
  adjustConfidence(
    baseConfidence: number,
    dataReport: DataAvailabilityReport,
  ): number {
    const { dataQuality, confidenceAdjustment } = dataReport;

    // Subtract the confidence adjustment
    let adjusted = Math.max(0, baseConfidence - confidenceAdjustment);

    // Apply maximum caps based on quality level
    switch (dataQuality) {
      case 'high':
        // No additional cap for high quality
        break;
      case 'medium':
        adjusted = Math.min(adjusted, this.config.maxMediumQualityConfidence);
        break;
      case 'low':
        adjusted = Math.min(adjusted, this.config.maxLowQualityConfidence);
        break;
    }

    return Math.max(0, Math.min(1, adjusted));
  }

  /**
   * Check if confirmation should be required
   */
  requiresConfirmation(dataReport: DataAvailabilityReport): boolean {
    switch (dataReport.dataQuality) {
      case 'high':
        return false;
      case 'medium':
        return this.config.requireConfirmationForMedium;
      case 'low':
        return this.config.requireConfirmationForLow;
      default:
        return true;
    }
  }

  /**
   * Build synthesis message based on data quality
   */
  private buildSynthesis(
    dataQuality: DataQuality,
    metrics: DataAvailabilityReport['metrics'],
    missingFields: string[],
  ): string {
    if (metrics.totalContacts === 0) {
      return '暂无联系人数据，无法生成关系盘点与行动建议。请先添加联系人并记录一些互动。';
    }

    if (metrics.totalInteractions === 0) {
      return `您已添加 ${metrics.totalContacts} 位联系人，但还没有任何互动记录。建议先添加一些互动记录，以便生成更准确的建议。`;
    }

    if (dataQuality === 'low') {
      return `当前数据较少（${metrics.totalContacts} 位联系人，${metrics.totalInteractions} 条互动记录）。随着数据积累，建议会更加精准。`;
    }

    if (dataQuality === 'medium') {
      return `基于 ${metrics.totalContacts} 位联系人和 ${metrics.totalInteractions} 条互动记录生成以下建议。添加更多互动记录可获得更精准的分析。`;
    }

    return `基于 ${metrics.totalContacts} 位联系人和 ${metrics.totalInteractions} 条互动记录的关系分析。`;
  }

  /**
   * Build next actions based on what's missing
   */
  private buildNextActions(
    dataQuality: DataQuality,
    missingFields: string[],
  ): NetworkActionOutput['nextActions'] {
    const actions: NetworkActionOutput['nextActions'] = [];

    if (missingFields.includes('contacts')) {
      actions.push({
        action: '添加第一位联系人',
        priority: 'high',
        estimatedTime: '2分钟',
      });
    }

    if (missingFields.includes('interactions') || missingFields.includes('contact_interactions')) {
      actions.push({
        action: '为现有联系人添加互动记录',
        priority: 'high',
        estimatedTime: '5分钟',
      });
    }

    if (missingFields.includes('recent_interactions')) {
      actions.push({
        action: '记录最近的互动以更新数据',
        priority: 'medium',
        estimatedTime: '3分钟',
      });
    }

    if (dataQuality === 'low' && !missingFields.includes('contacts')) {
      actions.push({
        action: '继续添加联系人并记录互动',
        priority: 'medium',
        estimatedTime: '持续进行',
      });
    }

    return actions;
  }

  /**
   * Build follow-ups with data limitation context
   */
  private buildFollowUps(
    dataQuality: DataQuality,
    metrics: DataAvailabilityReport['metrics'],
  ): NetworkActionOutput['followUps'] {
    if (metrics.totalContacts === 0) {
      return [];
    }

    // For low data, return a generic suggestion
    if (dataQuality === 'low') {
      return metrics.totalContacts > 0
        ? [
            {
              contactId: 'generic',
              contactName: '您的联系人',
              reason: '数据有限，建议添加更多互动记录以获得个性化建议',
              priority: 'low' as const,
              suggestedAction: '添加互动记录',
            },
          ]
        : [];
    }

    return [];
  }

  /**
   * Build recommendations with appropriate confidence levels
   */
  private buildRecommendations(
    dataQuality: DataQuality,
    metrics: DataAvailabilityReport['metrics'],
  ): NetworkActionOutput['recommendations'] {
    const recommendations: NetworkActionOutput['recommendations'] = [];

    const baseConfidence = dataQuality === 'high' ? 0.8 : dataQuality === 'medium' ? 0.5 : 0.2;

    if (metrics.totalContacts === 0) {
      recommendations.push({
        type: 'connection',
        description: '开始添加联系人，建立您的社交网络',
        contacts: [],
        confidence: baseConfidence,
      });
    }

    if (metrics.totalInteractions < 5 && metrics.totalContacts > 0) {
      recommendations.push({
        type: 'followup',
        description: `定期记录与 ${metrics.totalContacts} 位联系人的互动`,
        contacts: [],
        confidence: baseConfidence,
      });
    }

    return recommendations;
  }

  /**
   * Build action queues based on data quality
   */
  private buildQueues(dataQuality: DataQuality): NetworkActionOutput['queues'] {
    if (dataQuality === 'low') {
      return {
        urgentRepairs: [],
        opportunityBridges: [],
        lightTouches: [
          {
            id: 'add-interactions',
            contactId: 'system',
            contactName: '系统建议',
            action: '添加更多互动记录',
            priority: 'low',
            effortMinutes: 5,
            rationale: '数据有限，建议添加更多互动记录以获得个性化建议',
          },
        ],
      };
    }

    return {
      urgentRepairs: [],
      opportunityBridges: [],
      lightTouches: [],
    };
  }

  /**
   * Generate evidence annotation for data limitations
   */
  generateDataLimitationEvidence(dataReport: DataAvailabilityReport): DataLimitationEvidence[] {
    const evidence: DataLimitationEvidence[] = [];
    const { metrics, missingFields, dataQuality } = dataReport;

    if (dataQuality === 'low') {
      evidence.push({
        type: 'data_limitation',
        source: 'system',
        reference: '数据量不足，建议仅供参考',
      });
    }

    if (missingFields.includes('recent_interactions')) {
      evidence.push({
        type: 'recency',
        source: 'system',
        reference: '数据有限，建议基于最近一次互动',
      });
    }

    if (metrics.contactsWithInteraction < metrics.totalContacts) {
      evidence.push({
        type: 'coverage',
        source: 'system',
        reference: `仅 ${metrics.contactsWithInteraction}/${metrics.totalContacts} 位联系人有互动记录`,
      });
    }

    return evidence;
  }
}
