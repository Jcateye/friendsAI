import { BeforeInsert, BeforeUpdate, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from '../entities/timestamp-ms.transformer';
import { SkillDefinition } from './skill-definition.entity';
import type { SkillScopeType } from './skill-definition.entity';

@Entity('skill_release_rules')
@Index('IDX_skill_release_rules_definition_version_scope', ['definitionId', 'version', 'scopeType', 'scopeId'], { unique: true })
@Index('IDX_skill_release_rules_active', ['definitionId', 'isActive', 'scopeType', 'scopeId'])
export class SkillReleaseRule {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'definition_id', type: 'uuid' })
  definitionId: string;

  @ManyToOne(() => SkillDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'definition_id' })
  definition: SkillDefinition;

  @Column({ name: 'version', type: 'varchar', length: 64 })
  version: string;

  @Column({ name: 'scope_type', type: 'varchar', length: 20, default: 'global' })
  scopeType: SkillScopeType;

  @Column({ name: 'scope_id', type: 'varchar', length: 255, nullable: true })
  scopeId: string | null;

  @Column({ name: 'rollout_percent', type: 'int', default: 100 })
  rolloutPercent: number;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;

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
