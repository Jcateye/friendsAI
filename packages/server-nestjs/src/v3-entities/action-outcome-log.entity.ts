import { Entity, PrimaryColumn, Column, Index, BeforeInsert } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from '../entities/timestamp-ms.transformer';

@Entity('action_outcome_log')
@Index('IDX_outcome_user', ['userId'])
@Index('IDX_outcome_agent', ['agentName'])
@Index('IDX_outcome_timestamp', ['actionTimestamp'])
@Index('IDX_outcome_user_outcome', ['userId', 'outcomeType'])
export class ActionOutcomeLog {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string | null;

  @Column({ name: 'agent_name', type: 'varchar', length: 100 })
  agentName: string;

  @Column({ name: 'action_type', type: 'varchar', length: 50 })
  actionType: 'suggestion_shown' | 'suggestion_accepted' | 'message_sent' | 'message_replied' | 'followup_completed' | 'other';

  @Column({ name: 'action_metadata', type: 'jsonb', nullable: true })
  actionMetadata: Record<string, any> | null;

  @Column({ name: 'outcome_type', type: 'varchar', length: 50 })
  outcomeType: 'success' | 'partial' | 'failure' | 'pending' | 'skipped';

  @Column({ name: 'outcome_reason', type: 'varchar', length: 255, nullable: true })
  outcomeReason: string | null;

  @Column({ name: 'action_timestamp', type: 'bigint', transformer: timestampMsTransformer })
  actionTimestamp: Date;

  @Column({ name: 'response_time_seconds', type: 'int', nullable: true })
  responseTimeSeconds: number | null;

  @Column({ name: 'platform', type: 'varchar', length: 50, nullable: true })
  platform: 'feishu' | 'wechat' | 'email' | 'web' | 'other' | null;

  @Column({ name: 'message_id', type: 'uuid', nullable: true })
  messageId: string | null;

  @Column({ name: 'conversation_id', type: 'uuid', nullable: true })
  conversationId: string | null;

  @Column({ name: 'suggestion_id', type: 'uuid', nullable: true })
  suggestionId: string | null;

  @Column({ name: 'followup_required', type: 'boolean', default: false })
  followupRequired: boolean;

  @Column({ name: 'followup_deadline', type: 'timestamp', nullable: true })
  followupDeadline: Date | null;

  @Column({ name: 'conversion_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  conversionScore: number | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ name: 'created_at', type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @BeforeInsert()
  setId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
