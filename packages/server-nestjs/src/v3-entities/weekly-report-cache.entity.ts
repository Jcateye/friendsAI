import { Entity, PrimaryColumn, Column, Index, BeforeInsert } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from '../entities/timestamp-ms.transformer';

@Entity('weekly_report_cache')
@Index('IDX_report_user_week', ['userId', 'weekStartDate'], { unique: true })
export class WeeklyReportCache {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'week_start_date', type: 'date' })
  weekStartDate: Date;

  @Column({ name: 'week_end_date', type: 'date' })
  weekEndDate: Date;

  @Column({ name: 'report_data', type: 'jsonb' })
  reportData: Record<string, any>;

  @Column({ name: 'total_suggestions', type: 'int', default: 0 })
  totalSuggestions: number;

  @Column({ name: 'accepted_suggestions', type: 'int', default: 0 })
  acceptedSuggestions: number;

  @Column({ name: 'messages_sent', type: 'int', default: 0 })
  messagesSent: number;

  @Column({ name: 'messages_replied', type: 'int', default: 0 })
  messagesReplied: number;

  @Column({ name: 'followups_completed', type: 'int', default: 0 })
  followupsCompleted: number;

  @Column({ name: 'acceptance_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  acceptanceRate: number | null;

  @Column({ name: 'reply_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  replyRate: number | null;

  @Column({ name: 'conversion_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  conversionRate: number | null;

  @Column({ name: 'top_contacts', type: 'simple-array', nullable: true })
  topContacts: string[] | null;

  @Column({ name: 'risk_contacts', type: 'simple-array', nullable: true })
  riskContacts: string[] | null;

  @Column({ name: 'resolved_debts', type: 'int', default: 0 })
  resolvedDebts: number;

  @Column({ name: 'new_debts', type: 'int', default: 0 })
  newDebts: number;

  @Column({ name: 'key_insights', type: 'simple-array', nullable: true })
  keyInsights: string[] | null;

  @Column({ name: 'improvement_suggestions', type: 'simple-array', nullable: true })
  improvementSuggestions: string[] | null;

  @Column({ name: 'generation_version', length: 20, nullable: true })
  generationVersion: string | null;

  @Column({ name: 'is_regenerated', type: 'boolean', default: false })
  isRegenerated: boolean;

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
