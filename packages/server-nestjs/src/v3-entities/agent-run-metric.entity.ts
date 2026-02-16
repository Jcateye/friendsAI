import { BeforeInsert, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from '../entities/timestamp-ms.transformer';

export type AgentRunMetricEndpoint = 'run' | 'chat';
export type AgentRunMetricStatus = 'succeeded' | 'failed' | 'cancelled';

@Entity('agent_run_metrics')
@Index('IDX_agent_run_metrics_user_created', ['userId', 'createdAt'])
@Index('IDX_agent_run_metrics_agent_created', ['agentId', 'createdAt'])
@Index('IDX_agent_run_metrics_status_created', ['status', 'createdAt'])
@Index('IDX_agent_run_metrics_run_id', ['runId'], { unique: true })
export class AgentRunMetric {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'run_id', type: 'varchar', length: 64 })
  runId: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255, nullable: true })
  userId: string | null;

  @Column({ name: 'agent_id', type: 'varchar', length: 100 })
  agentId: string;

  @Column({ name: 'operation', type: 'varchar', length: 100, nullable: true })
  operation: string | null;

  @Column({ name: 'endpoint', type: 'varchar', length: 16 })
  endpoint: AgentRunMetricEndpoint;

  @Column({ name: 'status', type: 'varchar', length: 16 })
  status: AgentRunMetricStatus;

  @Column({ name: 'cached', type: 'boolean', default: false })
  cached: boolean;

  @Column({ name: 'duration_ms', type: 'int' })
  durationMs: number;

  @Column({ name: 'error_code', type: 'varchar', length: 120, nullable: true })
  errorCode: string | null;

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
