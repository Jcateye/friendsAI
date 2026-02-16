import { BeforeInsert, BeforeUpdate, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from '../entities/timestamp-ms.transformer';

export type SkillBindingScopeType = 'tenant' | 'agent' | 'capability';

@Entity('skill_bindings')
@Index('IDX_skill_bindings_unique_scope_key', ['tenantId', 'scopeType', 'scopeId', 'skillKey'], {
  unique: true,
})
@Index('IDX_skill_bindings_tenant', ['tenantId', 'scopeType', 'scopeId', 'enabled', 'priority'])
export class SkillBinding {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId: string;

  @Column({ name: 'scope_type', type: 'varchar', length: 20 })
  scopeType: SkillBindingScopeType;

  @Column({ name: 'scope_id', type: 'varchar', length: 255 })
  scopeId: string;

  @Column({ name: 'skill_key', type: 'varchar', length: 100 })
  skillKey: string;

  @Column({ name: 'priority', type: 'int', default: 100 })
  priority: number;

  @Column({ name: 'enabled', type: 'boolean', default: true })
  enabled: boolean;

  @Column({ name: 'rollout_percent', type: 'int', default: 100 })
  rolloutPercent: number;

  @Column({ name: 'pinned_version', type: 'varchar', length: 64, nullable: true })
  pinnedVersion: string | null;

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
