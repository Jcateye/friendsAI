import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Feedback type enum
 */
export enum FeedbackType {
  ACTION_ACCEPTED = 'action_accepted',
  ACTION_REJECTED = 'action_rejected',
  ACTION_MODIFIED = 'action_modified',
  INSIGHT_HELPFUL = 'insight_helpful',
  INSIGHT_NOT_HELPFUL = 'insight_not_helpful',
  OTHER = 'other',
}

/**
 * Create Agent Feedback DTO
 */
export class CreateAgentFeedbackDto {
  @ApiProperty({
    description: 'Agent that generated the action/insight',
    example: 'contact_insight',
  })
  agentId: string;

  @ApiProperty({
    description: 'Agent run ID',
    example: '01234567-89ab-cdef-0123-456789abcdef',
    required: false,
  })
  runId?: string;

  @ApiProperty({
    description: 'Action card ID being feedback on',
    example: 'action-123',
    required: false,
  })
  actionId?: string;

  @ApiProperty({
    description: 'Contact ID related to this feedback',
    example: '01234567-89ab-cdef-0123-456789abcdef',
    required: false,
  })
  contactId?: string;

  @ApiProperty({
    description: 'Feedback type',
    enum: FeedbackType,
    example: FeedbackType.ACTION_ACCEPTED,
  })
  feedbackType: FeedbackType;

  @ApiPropertyOptional({
    description: 'Feedback rating (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  rating?: number;

  @ApiPropertyOptional({
    description: 'Free-text feedback',
    example: 'This suggestion was very helpful!',
  })
  comment?: string;

  @ApiPropertyOptional({
    description: 'Original action/data that was feedback on',
    example: { action: 'Send a message', goal: 'Reconnect' },
  })
  originalData?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Modified action/data (if user modified)',
    example: { action: 'Send an email instead', goal: 'Reconnect' },
  })
  modifiedData?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Reason for rejection/modification',
    example: 'Too personal for a text message',
  })
  reason?: string;
}

/**
 * Agent Feedback Response DTO
 */
export class AgentFeedbackResponseDto {
  @ApiProperty({
    description: 'Feedback ID',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'User who provided feedback',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  userId: string;

  @ApiProperty({
    description: 'Agent that generated the action/insight',
    example: 'contact_insight',
  })
  agentId: string;

  @ApiPropertyOptional({
    description: 'Agent run ID',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  runId?: string;

  @ApiPropertyOptional({
    description: 'Action card ID being feedback on',
    example: 'action-123',
  })
  actionId?: string;

  @ApiPropertyOptional({
    description: 'Contact ID related to this feedback',
    example: '01234567-89ab-cdef-0123-456789abcdef',
  })
  contactId?: string;

  @ApiProperty({
    description: 'Feedback type',
    enum: FeedbackType,
  })
  feedbackType: FeedbackType;

  @ApiPropertyOptional({
    description: 'Feedback rating (1-5)',
    example: 5,
  })
  rating?: number;

  @ApiPropertyOptional({
    description: 'Free-text feedback',
  })
  comment?: string;

  @ApiPropertyOptional({
    description: 'Original action/data',
  })
  originalData?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Modified action/data',
  })
  modifiedData?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Reason for rejection/modification',
  })
  reason?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: string;
}
