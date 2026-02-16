import { BeforeInsert, BeforeUpdate, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from '../entities/timestamp-ms.transformer';
import { SkillDefinition } from './skill-definition.entity';

export type SkillVersionStatus = 'draft' | 'active' | 'deprecated';

@Entity('skill_versions')
@Index('IDX_skill_versions_definition_version', ['definitionId', 'version'], { unique: true })
@Index('IDX_skill_versions_definition_status', ['definitionId', 'status', 'updatedAt'])
export class SkillVersion {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'definition_id', type: 'uuid' })
  definitionId: string;

  @ManyToOne(() => SkillDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'definition_id' })
  definition: SkillDefinition;

  @Column({ name: 'version', type: 'varchar', length: 64 })
  version: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'draft' })
  status: SkillVersionStatus;

  @Column({ name: 'manifest', type: 'jsonb' })
  manifest: Record<string, unknown>;

  @Column({ name: 'parser_rules', type: 'jsonb', nullable: true })
  parserRules: Record<string, unknown> | null;

  @Column({ name: 'checksum', type: 'varchar', length: 128 })
  checksum: string;

  @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
  createdBy: string | null;

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
