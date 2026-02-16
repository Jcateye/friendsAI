import { BeforeInsert, BeforeUpdate, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from '../entities/timestamp-ms.transformer';

export type SkillScopeType = 'global' | 'tenant';

@Entity('skill_definitions')
@Index('IDX_skill_definitions_key_scope', ['skillKey', 'scopeType', 'scopeId'], { unique: true })
@Index('IDX_skill_definitions_scope', ['scopeType', 'scopeId', 'skillKey'])
export class SkillDefinition {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'skill_key', type: 'varchar', length: 100 })
  skillKey: string;

  @Column({ name: 'scope_type', type: 'varchar', length: 20 })
  scopeType: SkillScopeType;

  @Column({ name: 'scope_id', type: 'varchar', length: 255, nullable: true })
  scopeId: string | null;

  @Column({ name: 'display_name', type: 'varchar', length: 255 })
  displayName: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'enabled', type: 'boolean', default: true })
  enabled: boolean;

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
