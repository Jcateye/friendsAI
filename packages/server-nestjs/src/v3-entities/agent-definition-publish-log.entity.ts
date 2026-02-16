import { BeforeInsert, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from '../entities/timestamp-ms.transformer';

@Entity('agent_definition_publish_logs')
@Index('IDX_agent_definition_publish_logs_agent_created', ['agentId', 'createdAt'])
export class AgentDefinitionPublishLog {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'agent_id', type: 'varchar', length: 100 })
  agentId: string;

  @Column({ name: 'version', type: 'varchar', length: 64 })
  version: string;

  @Column({ name: 'action', type: 'varchar', length: 50 })
  action: string;

  @Column({ name: 'result', type: 'varchar', length: 20 })
  result: 'succeeded' | 'failed';

  @Column({ name: 'details', type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;

  @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: true })
  createdBy: string | null;

  @Column({ name: 'created_at', type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) {
      this.id = uuidv7();
    }
    this.createdAt = new Date();
  }
}
