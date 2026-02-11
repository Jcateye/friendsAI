/**
 * Prompt Validation Service
 *
 * Validates that agent prompts contain all required elements and constraints
 * for ensuring AI outputs conform to the enhanced schema requirements.
 *
 * Key validations:
 * - Critical field requirements (whyNow, evidence)
 * - Evidence structure requirements
 * - Output format examples
 * - Quality standard requirements
 */

import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface PromptValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PromptValidationOptions {
  /** Require evidence array in action definitions */
  requireEvidence?: boolean;
  /** Require whyNow field in action definitions */
  requireWhyNow?: boolean;
  /** Require specific output format examples */
  requireOutputFormat?: boolean;
  /** Require quality standards section */
  requireQualityStandards?: boolean;
}

@Injectable()
export class PromptValidationService {
  /**
   * Default validation options for enhanced schema compliance
   */
  private readonly defaultOptions: PromptValidationOptions = {
    requireEvidence: true,
    requireWhyNow: true,
    requireOutputFormat: true,
    requireQualityStandards: true,
  };

  /**
   * Validate a prompt template file
   */
  validatePromptFile(
    agentId: string,
    filename: 'system.mustache' | 'user.mustache',
    options?: PromptValidationOptions,
  ): PromptValidationResult {
    const opts = { ...this.defaultOptions, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const templatePath = join(
        process.cwd(),
        'src',
        'agent',
        'definitions',
        agentId,
        'templates',
        filename,
      );

      const content = readFileSync(templatePath, 'utf-8');

      // Only validate system.mustache for schema requirements
      if (filename === 'system.mustache') {
        this.validateSystemPrompt(content, opts, errors, warnings);
      }
    } catch (error) {
      errors.push(`Failed to read template file: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate prompt content string
   */
  validatePromptContent(
    content: string,
    options?: PromptValidationOptions,
  ): PromptValidationResult {
    const opts = { ...this.defaultOptions, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];

    this.validateSystemPrompt(content, opts, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate system prompt content for schema compliance
   */
  private validateSystemPrompt(
    content: string,
    options: PromptValidationOptions,
    errors: string[],
    warnings: string[],
  ): void {
    const lowerContent = content.toLowerCase();

    // Check for output format section
    if (options.requireOutputFormat) {
      if (!content.includes('## Output Format') && !content.includes('Output Format')) {
        errors.push('Missing "Output Format" section');
      }

      // Check for JSON example block
      if (!content.includes('```json') && !content.includes('``` JSON')) {
        errors.push('Missing JSON output format example');
      }
    }

    // Check for quality standards
    if (options.requireQualityStandards) {
      if (!content.includes('## Quality Standards') && !content.includes('Quality Standards')) {
        warnings.push('Missing "Quality Standards" section - AI may not understand quality requirements');
      }
    }

    // Check for critical field requirements
    if (options.requireWhyNow) {
      const hasWhyNowRequirement =
        content.includes('whyNow') ||
        content.includes('why now') ||
        content.includes('why_now');

      if (!hasWhyNowRequirement) {
        errors.push('Missing "whyNow" field requirement - AI may not provide timing rationale');
      }

      // Check that whyNow has specific requirements
      if (hasWhyNowRequirement && !content.includes('Specific') && !content.includes('data-driven')) {
        warnings.push(
          'whyNow requirement lacks specificity - AI may provide generic reasons',
        );
      }
    }

    if (options.requireEvidence) {
      const hasEvidenceRequirement =
        content.includes('evidence') ||
        content.includes('Evidence') ||
        content.includes('citations') ||
        content.includes('Citations');

      if (!hasEvidenceRequirement) {
        errors.push(
          'Missing "evidence" field requirement - AI outputs may lack data references',
        );
      }

      // Check for evidence structure requirements
      if (hasEvidenceRequirement) {
        const hasEvidenceStructure =
          content.includes('evidence:') ||
          content.includes('evidence[') ||
          content.includes('evidence [') ||
          content.includes('type:') ||
          content.includes('source:');

        if (!hasEvidenceStructure) {
          warnings.push(
            'Evidence field structure not clearly defined - AI may not include required fields (type, source, reference)',
          );
        }
      }
    }

    // Check for language requirements
    if (!content.includes('Output Language') && !content.includes('language')) {
      warnings.push('Missing output language specification - AI may output in unexpected language');
    }

    // Check for action card or queue specific requirements
    this.validateActionRequirements(content, errors, warnings);
  }

  /**
   * Validate action-specific requirements
   */
  private validateActionRequirements(
    content: string,
    errors: string[],
    warnings: string[],
  ): void {
    const hasActionCards = content.includes('actionCards') || content.includes('actionCards');
    const hasQueues = content.includes('queues') || content.includes('urgentRepairs');
    const hasActionSection = hasActionCards || hasQueues;

    if (hasActionSection) {
      // Check for effort requirements
      if (!content.includes('effort') && !content.includes('Effort')) {
        warnings.push(
          'Missing effort/time estimation requirements - AI may not provide realistic time estimates',
        );
      }

      // Check for confidence requirements
      if (!content.includes('confidence') && !content.includes('Confidence')) {
        warnings.push(
          'Missing confidence score requirements - AI may not indicate output reliability',
        );
      }

      // Check for risk level requirements
      if (!content.includes('risk') && !content.includes('Risk')) {
        warnings.push(
          'Missing risk level requirements - AI may not assess action implications',
        );
      }

      // Check for UUID requirements
      if (!content.includes('UUID') && !content.includes('uuid') && !content.includes('actionId')) {
        warnings.push(
          'Missing unique identifier requirements - Actions may not have proper IDs',
        );
      }
    }
  }

  /**
   * Validate all agent templates
   */
  validateAllAgents(agentIds: string[]): Record<string, PromptValidationResult> {
    const results: Record<string, PromptValidationResult> = {};

    for (const agentId of agentIds) {
      results[agentId] = this.validatePromptFile(agentId, 'system.mustache');
    }

    return results;
  }

  /**
   * Get validation summary for reporting
   */
  getValidationSummary(results: Record<string, PromptValidationResult>): {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
    details: Array<{ agentId: string; valid: boolean; errorCount: number; warningCount: number }>;
  } {
    const entries = Object.entries(results);
    const validCount = entries.filter(([, r]) => r.valid).length;
    const totalWarnings = entries.reduce((sum, [, r]) => sum + r.warnings.length, 0);

    return {
      total: entries.length,
      valid: validCount,
      invalid: entries.length - validCount,
      warnings: totalWarnings,
      details: entries.map(([agentId, result]) => ({
        agentId,
        valid: result.valid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
      })),
    };
  }
}
