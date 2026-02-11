import { Entity, PrimaryColumn, Column, Index, BeforeInsert } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from '../entities/timestamp-ms.transformer';

@Entity('relationship_health_snapshot')
@Index('IDX_health_snapshot_user_date', ['userId', 'snapshotDate'])
@Index('IDX_health_snapshot_contact_date', ['contactId', 'snapshotDate'])
export class RelationshipHealthSnapshot {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'contact_id', type: 'uuid' })
  contactId: string;

  @Column({ name: 'snapshot_date', type: 'date' })
  snapshotDate: Date;

  @Column({
    name: 'health_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  healthScore: number | null;

  @Column({
    name: 'risk_level',
    length: 20,
    nullable: true,
  })
  riskLevel: 'low' | 'medium' | 'high' | null;

  @Column({ name: 'last_interaction_at', type: 'timestamp', nullable: true })
  lastInteractionAt: Date | null;

  @Column({ name: 'interaction_frequency_days', type: 'int', nullable: true })
  interactionFrequencyDays: number | null;

  @Column({ name: 'total_interactions', type: 'int', default: 0 })
  totalInteractions: number;

  @Column({ name: 'insight_tags', type: 'simple-array', nullable: true })
  insightTags: string[] | null;

  @Column({ name: 'priority_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  priorityScore: number | null;

  @Column({ name: 'relationship_risk_level', length: 20, nullable: true })
  relationshipRiskLevel: 'stable' | 'declining' | 'critical' | null;

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
