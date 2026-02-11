/**
 * Data Availability Validator
 *
 * Assesses data quality for network action recommendations.
 * Helps prevent AI from "making up stories" when data is insufficient.
 */

import { Injectable, Logger } from '@nestjs/common';
import type { NetworkActionTemplateContext } from './network-action.types';

/**
 * Data quality level
 */
export type DataQuality = 'high' | 'medium' | 'low';

/**
 * Configuration for data availability validation
 */
export interface DataAvailabilityConfig {
  /** Minimum interactions for high quality data */
  minInteractionsForHighQuality: number;
  /** Minimum interactions for medium quality data */
  minInteractionsForMediumQuality: number;
  /** Minimum recency in days for data to be considered fresh */
  minRecencyDays: number;
  /** Whether reciprocity data is required */
  requireReciprocityData: boolean;
}

/**
 * Data availability report
 */
export interface DataAvailabilityReport {
  /** Whether there is sufficient data for reliable recommendations */
  hasSufficientData: boolean;
  /** Overall data quality assessment */
  dataQuality: DataQuality;
  /** Fields that are missing or insufficient */
  missingFields: string[];
  /** Confidence adjustment (0-1, to be subtracted from base confidence) */
  confidenceAdjustment: number;
  /** Detailed metrics */
  metrics: {
    totalContacts: number;
    totalInteractions: number;
    recentInteractions: number;
    contactsWithInteraction: number;
    avgInteractionsPerContact: number;
    hasReciprocityData: boolean;
    dataFreshness: 'fresh' | 'stale' | 'unknown';
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: DataAvailabilityConfig = {
  minInteractionsForHighQuality: 5,
  minInteractionsForMediumQuality: 2,
  minRecencyDays: 30,
  requireReciprocityData: false,
};

/**
 * Data Availability Validator
 *
 * Evaluates whether there is enough data to generate reliable recommendations.
 */
@Injectable()
export class DataAvailabilityValidator {
  private readonly logger = new Logger(DataAvailabilityValidator.name);
  private readonly config: DataAvailabilityConfig;

  constructor(config?: Partial<DataAvailabilityConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate data availability from template context
   */
  validate(context: NetworkActionTemplateContext): DataAvailabilityReport {
    const metrics = this.computeMetrics(context);
    const dataQuality = this.assessDataQuality(metrics);
    const missingFields = this.identifyMissingFields(metrics);
    const confidenceAdjustment = this.computeConfidenceAdjustment(dataQuality, metrics);

    const hasSufficientData = dataQuality !== 'low' || metrics.totalContacts > 0;

    const report: DataAvailabilityReport = {
      hasSufficientData,
      dataQuality,
      missingFields,
      confidenceAdjustment,
      metrics,
    };

    this.logReport(report);

    return report;
  }

  /**
   * Compute data metrics from context
   */
  private computeMetrics(context: NetworkActionTemplateContext): DataAvailabilityReport['metrics'] {
    const totalContacts = context.contacts.length;
    const totalInteractions = context.metadata.totalInteractions;
    const recentInteractions = context.recentInteractions.length;

    // Count contacts with at least one interaction
    const contactsWithInteraction = context.contacts.filter(
      (c) => c.lastInteractionAt && c.lastInteractionAt !== '从未交互',
    ).length;

    const avgInteractionsPerContact =
      totalContacts > 0 ? totalInteractions / totalContacts : 0;

    // Check for reciprocity data (presence of both sent/received patterns)
    const hasReciprocityData = this.hasReciprocityData(context);

    // Assess data freshness
    const dataFreshness = this.assessFreshness(context);

    return {
      totalContacts,
      totalInteractions,
      recentInteractions,
      contactsWithInteraction,
      avgInteractionsPerContact,
      hasReciprocityData,
      dataFreshness,
    };
  }

  /**
   * Check if context contains reciprocity data
   */
  private hasReciprocityData(context: NetworkActionTemplateContext): boolean {
    // In a real implementation, this would check for bidirectional communication patterns
    // For now, we assume reciprocity data exists if there are interactions
    return context.recentInteractions.length > 1;
  }

  /**
   * Assess data freshness based on recency of interactions
   */
  private assessFreshness(context: NetworkActionTemplateContext): 'fresh' | 'stale' | 'unknown' {
    if (context.recentInteractions.length === 0) {
      return 'unknown';
    }

    const mostRecent = new Date(context.recentInteractions[0].date);
    const daysSinceMostRecent = Math.floor(
      (Date.now() - mostRecent.getTime()) / (1000 * 60 * 60 * 24),
    );

    return daysSinceMostRecent <= this.config.minRecencyDays ? 'fresh' : 'stale';
  }

  /**
   * Assess overall data quality level
   */
  private assessDataQuality(metrics: DataAvailabilityReport['metrics']): DataQuality {
    const { totalContacts, totalInteractions, recentInteractions, avgInteractionsPerContact, dataFreshness } =
      metrics;

    // High quality: sufficient interactions, good coverage, fresh data
    const hasHighInteractions = totalInteractions >= this.config.minInteractionsForHighQuality * totalContacts;
    const hasMediumInteractions = totalInteractions >= this.config.minInteractionsForMediumQuality * totalContacts;
    const isFresh = dataFreshness === 'fresh';
    const hasGoodCoverage = avgInteractionsPerContact >= 2;

    if (hasHighInteractions && isFresh && hasGoodCoverage) {
      return 'high';
    }

    // Medium quality: some interactions but limited
    if (hasMediumInteractions && totalContacts > 0) {
      return 'medium';
    }

    // Low quality: very little data
    return 'low';
  }

  /**
   * Identify missing or insufficient data fields
   */
  private identifyMissingFields(metrics: DataAvailabilityReport['metrics']): string[] {
    const missing: string[] = [];

    if (metrics.totalContacts === 0) {
      missing.push('contacts');
    }

    if (metrics.totalInteractions === 0) {
      missing.push('interactions');
    }

    if (metrics.contactsWithInteraction === 0 && metrics.totalContacts > 0) {
      missing.push('contact_interactions');
    }

    if (metrics.dataFreshness === 'stale') {
      missing.push('recent_interactions');
    }

    if (!metrics.hasReciprocityData && this.config.requireReciprocityData) {
      missing.push('reciprocity_data');
    }

    return missing;
  }

  /**
   * Compute confidence adjustment based on data quality
   * Returns a value 0-1 that should be subtracted from base confidence
   */
  private computeConfidenceAdjustment(
    dataQuality: DataQuality,
    metrics: DataAvailabilityReport['metrics'],
  ): number {
    switch (dataQuality) {
      case 'high':
        // Minimal adjustment for high quality data
        return metrics.dataFreshness === 'fresh' ? 0 : 0.1;

      case 'medium':
        // Moderate adjustment for medium quality data
        return 0.3;

      case 'low':
        // Significant adjustment for low quality data
        if (metrics.totalContacts === 0) {
          return 0.9; // Almost no confidence without any data
        }
        return 0.6; // Still substantial reduction

      default:
        return 0.5;
    }
  }

  /**
   * Log the report for debugging
   */
  private logReport(report: DataAvailabilityReport): void {
    this.logger.debug(
      `Data availability report: quality=${report.dataQuality}, ` +
        `sufficient=${report.hasSufficientData}, ` +
        `adjustment=${report.confidenceAdjustment}, ` +
        `contacts=${report.metrics.totalContacts}, ` +
        `interactions=${report.metrics.totalInteractions}`,
    );
  }
}
