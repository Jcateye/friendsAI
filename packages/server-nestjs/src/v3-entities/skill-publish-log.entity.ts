import { BeforeInsert, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from '../entities/timestamp-ms.transformer';

@Entity('skill_publish_logs')
@Index('IDX_skill_publish_logs_definition_published', ['definitionId', 'publishedAt'])
@Index('IDX_skill_publish_logs_skill_version', ['skillKey', 'version', 'publishedAt'])
export class SkillPublishLog {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'definition_id', type: 'uuid' })
  definitionId: string;

  @Column({ name: 'skill_key', type: 'varchar', length: 100 })
  skillKey: string;

  @Column({ name: 'version', type: 'varchar', length: 64 })
  version: string;

  @Column({ name: 'scope_type', type: 'varchar', length: 20 })
  scopeType: string;

  @Column({ name: 'scope_id', type: 'varchar', length: 255, nullable: true })
  scopeId: string | null;

  @Column({ name: 'rollout_percent', type: 'int' })
  rolloutPercent: number;

  @Column({ name: 'export_path', type: 'text' })
  exportPath: string;

  @Column({ name: 'published_by', type: 'varchar', length: 255, nullable: true })
  publishedBy: string | null;

  @Column({ name: 'published_at', type: 'bigint', transformer: timestampMsTransformer })
  publishedAt: Date;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) {
      this.id = uuidv7();
    }
    if (!this.publishedAt) {
      this.publishedAt = new Date();
    }
  }
}
