import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from './timestamp-ms.transformer';

/**
 * Agent Feedback Entity
 * Stores user feedback on agent-generated action cards and insights
 */
@Entity({ name: 'agent_feedback' })
@Index('IDX_agent_feedback_userId', ['userId'])
@Index('IDX_agent_feedback_agentId', ['agentId'])
@Index('IDX_agent_feedback_runId', ['runId'])
@Index('IDX_agent_feedback_actionId', ['actionId'])
@Index('IDX_agent_feedback_createdAt', ['createdAt'])
export class AgentFeedback {
  @PrimaryColumn('uuid')
  id: string;

  /** User who provided feedback */
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  /** Agent that generated the action/insight */
  @Column({ type: 'text' })
  agentId: string;

  /** Agent run ID */
  @Column({ type: 'uuid', nullable: true })
  runId: string | null;

  /** Action card ID being feedback on (if applicable) */
  @Column({ type: 'text', nullable: true })
  actionId: string | null;

  /** Contact ID related to this feedback (if applicable) */
  @Column({ type: 'uuid', nullable: true })
  contactId: string | null;

  /** Feedback type */
  @Column({
    type: 'enum',
    enum: ['action_accepted', 'action_rejected', 'action_modified', 'insight_helpful', 'insight_not_helpful', 'other'],
  })
  feedbackType: 'action_accepted' | 'action_rejected' | 'action_modified' | 'insight_helpful' | 'insight_not_helpful' | 'other';

  /** Feedback rating (1-5, optional) */
  @Column({ type: 'int', nullable: true })
  rating: number | null;

  /** Free-text feedback */
  @Column({ type: 'text', nullable: true })
  comment: string | null;

  /** Original action/data that was feedback on */
  @Column({ type: 'jsonb', nullable: true })
  originalData: Record<string, any> | null;

  /** Modified action/data (if user modified) */
  @Column({ type: 'jsonb', nullable: true })
  modifiedData: Record<string, any> | null;

  /** Reason for rejection/modification */
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  updatedAt: Date;

  @BeforeInsert()
  setCreatedAt() {
    if (!this.id) {
      this.id = uuidv7();
    }
    const now = new Date();
    this.createdAt = now;
    this.updatedAt = now;
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
