import { BeforeInsert, BeforeUpdate, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from '../entities/timestamp-ms.transformer';

export type AgentDefinitionVersionStatus = 'draft' | 'active' | 'deprecated';

@Entity('agent_definition_versions')
@Index('IDX_agent_definition_versions_agent_version', ['agentId', 'version'], { unique: true })
@Index('IDX_agent_definition_versions_agent_status', ['agentId', 'status', 'updatedAt'])
export class AgentDefinitionVersion {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'agent_id', type: 'varchar', length: 100 })
  agentId: string;

  @Column({ name: 'version', type: 'varchar', length: 64 })
  version: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'draft' })
  status: AgentDefinitionVersionStatus;

  @Column({ name: 'template_bundle', type: 'jsonb' })
  templateBundle: Record<string, unknown>;

  @Column({ name: 'schema', type: 'jsonb' })
  schema: Record<string, unknown>;

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
