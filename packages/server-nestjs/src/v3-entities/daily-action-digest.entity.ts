import { BeforeInsert, BeforeUpdate, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from '../entities/timestamp-ms.transformer';

@Entity('daily_action_digests')
@Index('IDX_daily_action_digests_user_date', ['userId', 'digestDate'], { unique: true })
export class DailyActionDigest {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'digest_date', type: 'date' })
  digestDate: Date;

  @Column({ name: 'generated_at', type: 'bigint', transformer: timestampMsTransformer })
  generatedAt: Date;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

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
    if (!this.generatedAt) {
      this.generatedAt = now;
    }
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.updatedAt = new Date();
  }
}
