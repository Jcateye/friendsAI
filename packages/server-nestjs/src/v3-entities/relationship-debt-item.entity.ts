import { Entity, PrimaryColumn, Column, Index, BeforeInsert } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from '../entities/timestamp-ms.transformer';

@Entity('relationship_debt_item')
@Index('IDX_debt_user_contact', ['userId', 'contactId'])
@Index('IDX_debt_user_status', ['userId', 'status'])
@Index('IDX_debt_type', ['debtType'])
export class RelationshipDebtItem {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'contact_id', type: 'uuid' })
  contactId: string;

  @Column({
    name: 'debt_type',
    type: 'varchar',
    length: 50,
  })
  debtType: 'unresponded_message' | 'missed_follow_up' | 'broken_promise' | 'long_no_contact' | 'other';

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'severity', type: 'varchar', length: 20, default: 'medium' })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Column({ name: 'days_overdue', type: 'int', nullable: true })
  daysOverdue: number | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'in_progress' | 'resolved' | 'dismissed';

  @Column({ name: 'suggested_action', type: 'text', nullable: true })
  suggestedAction: string | null;

  @Column({ name: 'suggested_message_template', type: 'text', nullable: true })
  suggestedMessageTemplate: string | null;

  @Column({ name: 'original_event_id', type: 'uuid', nullable: true })
  originalEventId: string | null;

  @Column({ name: 'original_conversation_id', type: 'uuid', nullable: true })
  originalConversationId: string | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ name: 'created_at', type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'bigint', transformer: timestampMsTransformer })
  updatedAt: Date;

  @BeforeInsert()
  setId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
