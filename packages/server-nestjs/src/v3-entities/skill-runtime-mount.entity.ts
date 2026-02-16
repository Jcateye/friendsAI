import { BeforeInsert, BeforeUpdate, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from '../entities/timestamp-ms.transformer';

export type SkillRuntimeMountStatus = 'applied' | 'failed' | 'skipped' | 'pending';

@Entity('skill_runtime_mounts')
@Index('IDX_skill_runtime_mounts_unique_scope', ['tenantId', 'engine', 'agentScope'], {
  unique: true,
})
@Index('IDX_skill_runtime_mounts_tenant', ['tenantId', 'engine', 'agentScope', 'updatedAt'])
export class SkillRuntimeMount {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId: string;

  @Column({ name: 'engine', type: 'varchar', length: 50 })
  engine: string;

  @Column({ name: 'agent_scope', type: 'varchar', length: 255 })
  agentScope: string;

  @Column({ name: 'desired_hash', type: 'varchar', length: 128 })
  desiredHash: string;

  @Column({ name: 'applied_hash', type: 'varchar', length: 128, nullable: true })
  appliedHash: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20 })
  status: SkillRuntimeMountStatus;

  @Column({ name: 'details', type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;

  @Column({ name: 'last_reconcile_at', type: 'bigint', transformer: timestampMsTransformer, nullable: true })
  lastReconcileAt: Date | null;

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
    if (!this.lastReconcileAt) {
      this.lastReconcileAt = now;
    }
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.updatedAt = new Date();
  }
}
