/**
 * Action Card Generator Service
 *
 * Generates comprehensive action cards for contact follow-ups with
 * whyNow explanations, evidence points, risk levels, and confidence scores.
 */

import {
  calculatePriorityFromRaw,
  PriorityScoreResult,
} from './priority-scorer';

/**
 * Moment window types for time-sensitive opportunities
 */
export type MomentWindowType =
  | 'birthday'
  | 'holiday'
  | 'work_anniversary'
  | 'project_milestone'
  | 'life_event'
  | 'seasonal';

/**
 * A time-sensitive opportunity window
 */
export interface MomentWindow {
  /** Type of moment window */
  type: MomentWindowType;
  /** Human-readable description */
  description: string;
  /** Relevance weight (0-1, higher = more important) */
  weight: number;
  /** When this window expires */
  expiresAt: Date;
}

/**
 * A single evidence point supporting the action
 */
export interface EvidencePoint {
  /** Type of evidence */
  type: 'recency' | 'reciprocity' | 'moment' | 'importance' | 'pattern';
  /** Human-readable description */
  description: string;
  /** Strength of this evidence (0-1) */
  strength: number;
}

/**
 * Risk level for relationship health
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Contact tier for importance classification
 */
export type ContactTier = 'vip' | 'important' | 'regular' | 'distant';

/**
 * Input for generating an action card
 */
export interface ActionCardGeneratorInput {
  /** Contact ID */
  contactId: string;
  /** Contact name */
  contactName: string;
  /** Last interaction date */
  lastInteractionAt: Date;
  /** Total number of interactions */
  interactionCount: number;
  /** Reciprocity score (0-1, higher = more balanced) */
  reciprocityScore: number;
  /** Importance score (0-1) */
  importanceScore: number;
  /** Current active moment windows */
  momentWindows?: MomentWindow[];
  /** Recent interactions with summaries */
  recentInteractions: Array<{
    date: Date;
    summary: string;
  }>;
  /** Number of messages sent by user */
  messagesSent: number;
  /** Number of messages received from contact */
  messagesReceived: number;
  /** Historical response rate (0-1) */
  responseRate: number;
  /** Contact tier */
  tier?: ContactTier;
}

/**
 * Output of action card generation
 */
export interface ActionCardGeneratorOutput {
  /** Contact ID */
  contactId: string;
  /** Contact name */
  contactName: string;
  /** Natural language explanation of why now */
  whyNow: string;
  /** Evidence supporting the action */
  evidence: EvidencePoint[];
  /** Risk level if no action taken */
  riskLevel: RiskLevel;
  /** Estimated effort in minutes */
  effortMinutes: number;
  /** Confidence in recommendation (0-1) */
  confidence: number;
  /** Whether user confirmation is recommended */
  requiresConfirmation: boolean;
  /** Priority score result */
  priority: PriorityScoreResult;
  /** Suggested action type */
  actionType: 'greeting' | 'catch_up' | 'special_occasion' | 'deep_conversation';
}

/**
 * Generate an action card from input data
 */
export function generateActionCard(
  input: ActionCardGeneratorInput
): ActionCardGeneratorOutput {
  const {
    contactId,
    contactName,
    lastInteractionAt,
    interactionCount,
    reciprocityScore,
    importanceScore,
    momentWindows = [],
    messagesSent,
    messagesReceived,
    responseRate,
    tier = inferTierFromImportance(importanceScore),
  } = input;

  // Calculate priority score
  const daysSinceLastContact = calculateDaysSince(lastInteractionAt);
  const hasOpportunity = momentWindows.length > 0;

  const priority = calculatePriorityFromRaw({
    daysSinceLastContact,
    messagesSent,
    messagesReceived,
    tier,
    hasOpportunity,
    responseRate,
  });

  // Generate evidence points
  const evidence = generateEvidencePoints({
    daysSinceLastContact,
    interactionCount,
    reciprocityScore,
    importanceScore,
    momentWindows,
    messagesSent,
    messagesReceived,
  });

  // Calculate risk level
  const riskLevel = calculateRiskLevel({
    daysSinceLastContact,
    importanceScore,
    reciprocityScore,
    priorityScore: priority.score,
  });

  // Calculate confidence
  const confidence = calculateConfidence({
    interactionCount,
    daysSinceLastContact,
    hasReciprocityData: messagesSent + messagesReceived > 0,
  });

  // Estimate effort
  const effortMinutes = estimateEffort({
    actionType: inferActionType(priority.queue, momentWindows),
    daysSinceLastContact,
    hasSpecialOccasion: momentWindows.length > 0,
  });

  // Generate whyNow text
  const whyNow = generateWhyNowText({
    contactName,
    daysSinceLastContact,
    priority,
    evidence,
    momentWindows,
  });

  // Determine if confirmation is needed
  const requiresConfirmation = determineConfirmationNeeded({
    confidence,
    riskLevel,
    effortMinutes,
  });

  // Infer action type
  const actionType = inferActionType(priority.queue, momentWindows);

  return {
    contactId,
    contactName,
    whyNow,
    evidence,
    riskLevel,
    effortMinutes,
    confidence,
    requiresConfirmation,
    priority,
    actionType,
  };
}

/**
 * Calculate days since a given date
 */
function calculateDaysSince(date: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Infer contact tier from importance score
 */
function inferTierFromImportance(importanceScore: number): ContactTier {
  if (importanceScore >= 0.8) return 'vip';
  if (importanceScore >= 0.6) return 'important';
  if (importanceScore >= 0.4) return 'regular';
  return 'distant';
}

/**
 * Generate evidence points from input data
 */
interface EvidenceInput {
  daysSinceLastContact: number;
  interactionCount: number;
  reciprocityScore: number;
  importanceScore: number;
  momentWindows: MomentWindow[];
  messagesSent: number;
  messagesReceived: number;
}

function generateEvidencePoints(input: EvidenceInput): EvidencePoint[] {
  const points: EvidencePoint[] = [];

  const {
    daysSinceLastContact,
    interactionCount,
    reciprocityScore,
    importanceScore,
    momentWindows,
    messagesSent,
    messagesReceived,
  } = input;

  // Recency evidence
  if (daysSinceLastContact > 90) {
    points.push({
      type: 'recency',
      description: `${daysSinceLastContact}天未联系，关系可能正在疏远`,
      strength: Math.min(1, daysSinceLastContact / 365),
    });
  } else if (daysSinceLastContact > 30) {
    points.push({
      type: 'recency',
      description: `${daysSinceLastContact}天未联系，适合问候`,
      strength: 0.5,
    });
  }

  // Reciprocity evidence
  const totalMessages = messagesSent + messagesReceived;
  if (totalMessages > 0) {
    const sentRatio = messagesSent / totalMessages;
    if (sentRatio > 0.7) {
      points.push({
        type: 'reciprocity',
        description: `沟通较单向（你发${messagesSent}条，收${messagesReceived}条），需要平衡`,
        strength: sentRatio - 0.5,
      });
    } else if (messagesReceived > messagesSent * 1.5) {
      points.push({
        type: 'reciprocity',
        description: `对方最近主动过${messagesReceived - messagesSent}次，应该回应`,
        strength: 0.7,
      });
    }
  }

  // Moment window evidence
  momentWindows.forEach((window) => {
    points.push({
      type: 'moment',
      description: window.description,
      strength: window.weight,
    });
  });

  // Importance evidence
  if (importanceScore > 0.7) {
    points.push({
      type: 'importance',
      description: '这是重要联系人，值得投入时间维护关系',
      strength: importanceScore,
    });
  }

  // Pattern evidence
  if (interactionCount > 10) {
    points.push({
      type: 'pattern',
      description: `已有${interactionCount}次互动历史，关系基础良好`,
      strength: Math.min(1, interactionCount / 50),
    });
  }

  return points;
}

/**
 * Calculate risk level if no action is taken
 */
interface RiskLevelInput {
  daysSinceLastContact: number;
  importanceScore: number;
  reciprocityScore: number;
  priorityScore: number;
}

function calculateRiskLevel(input: RiskLevelInput): RiskLevel {
  const { daysSinceLastContact, importanceScore, reciprocityScore, priorityScore } =
    input;

  // High risk: Long gap + high importance + poor reciprocity
  if (
    daysSinceLastContact > 90 &&
    importanceScore > 0.6 &&
    reciprocityScore < 0.4
  ) {
    return 'high';
  }

  // High risk: Very high priority score
  if (priorityScore >= 75) {
    return 'high';
  }

  // Medium risk: Moderate gap or declining reciprocity
  if (
    daysSinceLastContact > 30 ||
    (priorityScore >= 45 && reciprocityScore < 0.5)
  ) {
    return 'medium';
  }

  return 'low';
}

/**
 * Calculate confidence in the recommendation
 */
interface ConfidenceInput {
  interactionCount: number;
  daysSinceLastContact: number;
  hasReciprocityData: boolean;
}

function calculateConfidence(input: ConfidenceInput): number {
  const { interactionCount, daysSinceLastContact, hasReciprocityData } = input;

  let confidence = 0.3; // Base confidence

  // More interactions = higher confidence
  confidence += Math.min(0.3, interactionCount / 100);

  // Has reciprocity data = higher confidence
  if (hasReciprocityData) {
    confidence += 0.2;
  }

  // Recent data = higher confidence
  if (daysSinceLastContact < 365) {
    confidence += 0.1;
  }

  return Math.min(1, confidence);
}

/**
 * Estimate effort in minutes for the suggested action
 */
interface EffortInput {
  actionType: 'greeting' | 'catch_up' | 'special_occasion' | 'deep_conversation';
  daysSinceLastContact: number;
  hasSpecialOccasion: boolean;
}

function estimateEffort(input: EffortInput): number {
  const { actionType, daysSinceLastContact, hasSpecialOccasion } = input;

  const baseEffort: Record<
    typeof actionType,
    { min: number; max: number }
  > = {
    greeting: { min: 5, max: 15 },
    catch_up: { min: 15, max: 30 },
    special_occasion: { min: 20, max: 45 },
    deep_conversation: { min: 30, max: 60 },
  };

  const { min, max } = baseEffort[actionType];

  // Adjust for gap size
  let multiplier = 1;
  if (daysSinceLastContact > 180) {
    multiplier = 1.3;
  } else if (daysSinceLastContact > 90) {
    multiplier = 1.1;
  }

  return Math.round((min + (max - min) / 2) * multiplier);
}

/**
 * Generate natural language "why now" explanation
 */
interface WhyNowInput {
  contactName: string;
  daysSinceLastContact: number;
  priority: PriorityScoreResult;
  evidence: EvidencePoint[];
  momentWindows: MomentWindow[];
}

function generateWhyNowText(input: WhyNowInput): string {
  const { contactName, daysSinceLastContact, priority, evidence, momentWindows } =
    input;

  const parts: string[] = [];

  // Priority-based opening
  if (priority.priority === 'high') {
    parts.push(`与${contactName}的关系需要紧急关注`);
  } else if (priority.priority === 'medium') {
    parts.push(`与${contactName}保持联系的好时机`);
  } else {
    parts.push(`适合与${contactName}轻松问候`);
  }

  // Time-based context
  if (daysSinceLastContact > 180) {
    parts.push(`已经${Math.floor(daysSinceLastContact / 30)}个月没有交流`);
  } else if (daysSinceLastContact > 30) {
    parts.push(`${daysSinceLastContact}天未联系`);
  }

  // Moment windows
  if (momentWindows.length > 0) {
    const windowTypes = momentWindows.map((w) => w.description);
    parts.push(`正值${windowTypes.join('、')}`);
  }

  // Combine evidence
  const strongEvidence = evidence
    .filter((e) => e.strength > 0.5)
    .slice(0, 2)
    .map((e) => e.description);

  if (strongEvidence.length > 0) {
    parts.push(strongEvidence.join('，'));
  }

  return parts.join('，') + '。';
}

/**
 * Determine if user confirmation is recommended
 */
interface ConfirmationInput {
  confidence: number;
  riskLevel: RiskLevel;
  effortMinutes: number;
}

function determineConfirmationNeeded(input: ConfirmationInput): boolean {
  const { confidence, riskLevel, effortMinutes } = input;

  // Low confidence = should confirm
  if (confidence < 0.5) {
    return true;
  }

  // High risk + high effort = should confirm
  if (riskLevel === 'high' && effortMinutes > 30) {
    return true;
  }

  return false;
}

/**
 * Infer action type from priority queue and moment windows
 */
function inferActionType(
  queue: PriorityScoreResult['queue'],
  momentWindows: MomentWindow[]
): ActionCardGeneratorOutput['actionType'] {
  // Special occasion takes precedence
  if (
    momentWindows.some(
      (w) =>
        w.type === 'birthday' ||
        w.type === 'holiday' ||
        w.type === 'work_anniversary' ||
        w.type === 'life_event'
    )
  ) {
    return 'special_occasion';
  }

  // High urgency = deep conversation needed
  if (queue === 'urgentRepairs') {
    return 'deep_conversation';
  }

  // Medium priority = catch up
  if (queue === 'opportunityBridges') {
    return 'catch_up';
  }

  // Low priority = simple greeting
  return 'greeting';
}
