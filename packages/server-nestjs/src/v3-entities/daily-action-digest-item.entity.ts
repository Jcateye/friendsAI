import { BeforeInsert, BeforeUpdate, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from '../entities/timestamp-ms.transformer';
import { DailyActionDigest } from './daily-action-digest.entity';

@Entity('daily_action_digest_items')
@Index('IDX_daily_action_digest_items_digest_rank', ['digestId', 'rank'], { unique: true })
export class DailyActionDigestItem {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'digest_id', type: 'uuid' })
  digestId: string;

  @ManyToOne(() => DailyActionDigest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'digest_id' })
  digest: DailyActionDigest;

  @Column({ name: 'rank', type: 'int' })
  rank: number;

  @Column({ name: 'action_type', type: 'varchar', length: 50 })
  actionType: string;

  @Column({ name: 'source_agent_id', type: 'varchar', length: 100 })
  sourceAgentId: string;

  @Column({ name: 'source_ref', type: 'varchar', length: 255, nullable: true })
  sourceRef: string | null;

  @Column({ name: 'title', type: 'text' })
  title: string;

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'priority_score', type: 'numeric', precision: 5, scale: 2, default: 0 })
  priorityScore: number;

  @Column({ name: 'confidence', type: 'numeric', precision: 5, scale: 2, nullable: true })
  confidence: number | null;

  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ name: 'created_at', type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'bigint', transformer: timestampMsTransformer })
  updatedAt: Date;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) {
      this.id = uuidv7();
    }
    const now = new Date();
    this.createdAt = now;
    this.updatedAt = now;
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.updatedAt = new Date();
  }
}
