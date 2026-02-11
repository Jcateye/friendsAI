/**
 * Priority Scoring for Contact Actions
 *
 * Based on the design document formula:
 * priority = 0.35*recencyGap + 0.25*reciprocityGap + 0.20*importance + 0.10*momentWindow + 0.10*replyLikelihood
 *
 * Score ranges:
 * - >=75: urgentRepairs
 * - 45~74: opportunityBridges
 * - <45: lightTouches
 */

export interface PriorityScoreInput {
  /** How long since last interaction (normalized 0-100, higher = longer gap) */
  recencyGap: number;
  /** Imbalance in communication (normalized 0-100, higher = more one-sided) */
  reciprocityGap: number;
  /** Contact importance (normalized 0-100, higher = more important) */
  importance: number;
  /** Current opportunity window relevance (normalized 0-100) */
  momentWindow: number;
  /** Likelihood of positive response (normalized 0-100) */
  replyLikelihood: number;
}

export interface PriorityScoreResult {
  /** Raw score from 0-100 */
  score: number;
  /** Categorized queue */
  queue: 'urgentRepairs' | 'opportunityBridges' | 'lightTouches';
  /** Priority level for display */
  priority: 'high' | 'medium' | 'low';
}

/**
 * Calculate priority score for a contact action
 */
export function calculatePriorityScore(input: PriorityScoreInput): PriorityScoreResult {
  const {
    recencyGap,
    reciprocityGap,
    importance,
    momentWindow,
    replyLikelihood,
  } = input;

  // Validate inputs are in valid range
  if (recencyGap < 0 || recencyGap > 100) {
    throw new Error(`recencyGap must be between 0 and 100, got ${recencyGap}`);
  }
  if (reciprocityGap < 0 || reciprocityGap > 100) {
    throw new Error(`reciprocityGap must be between 0 and 100, got ${reciprocityGap}`);
  }
  if (importance < 0 || importance > 100) {
    throw new Error(`importance must be between 0 and 100, got ${importance}`);
  }
  if (momentWindow < 0 || momentWindow > 100) {
    throw new Error(`momentWindow must be between 0 and 100, got ${momentWindow}`);
  }
  if (replyLikelihood < 0 || replyLikelihood > 100) {
    throw new Error(`replyLikelihood must be between 0 and 100, got ${replyLikelihood}`);
  }

  // Calculate weighted score
  const score = Math.round(
    0.35 * recencyGap +
    0.25 * reciprocityGap +
    0.20 * importance +
    0.10 * momentWindow +
    0.10 * replyLikelihood
  );

  // Categorize into queue
  let queue: PriorityScoreResult['queue'];
  let priority: PriorityScoreResult['priority'];

  if (score >= 75) {
    queue = 'urgentRepairs';
    priority = 'high';
  } else if (score >= 45) {
    queue = 'opportunityBridges';
    priority = 'medium';
  } else {
    queue = 'lightTouches';
    priority = 'low';
  }

  return { score, queue, priority };
}

/**
 * Calculate priority score from raw data (non-normalized)
 * This is a convenience function that normalizes values before scoring
 */
export interface RawPriorityInput {
  /** Days since last interaction */
  daysSinceLastContact: number;
  /** Number of messages sent vs received */
  messagesSent: number;
  messagesReceived: number;
  /** Contact tier */
  tier: 'vip' | 'important' | 'regular' | 'distant';
  /** Whether there's a current time-sensitive opportunity */
  hasOpportunity: boolean;
  /** Historical response rate (0-1) */
  responseRate: number;
}

export function calculatePriorityFromRaw(input: RawPriorityInput): PriorityScoreResult {
  // Normalize recency gap (0-365 days -> 0-100)
  const recencyGap = Math.min(100, Math.round((input.daysSinceLastContact / 365) * 100));

  // Normalize reciprocity gap (messages sent vs received)
  const totalMessages = input.messagesSent + input.messagesReceived;
  let reciprocityGap = 0;
  if (totalMessages > 0) {
    const sentRatio = input.messagesSent / totalMessages;
    // If sent ratio is far from 0.5, gap increases
    reciprocityGap = Math.round(Math.abs(sentRatio - 0.5) * 2 * 100);
  }

  // Normalize importance by tier
  const tierImportance: Record<RawPriorityInput['tier'], number> = {
    vip: 100,
    important: 75,
    regular: 50,
    distant: 25,
  };
  const importance = tierImportance[input.tier];

  // Normalize moment window
  const momentWindow = input.hasOpportunity ? 100 : 0;

  // Normalize response rate
  const replyLikelihood = Math.round(input.responseRate * 100);

  return calculatePriorityScore({
    recencyGap,
    reciprocityGap,
    importance,
    momentWindow,
    replyLikelihood,
  });
}
