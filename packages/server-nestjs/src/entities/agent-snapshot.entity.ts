import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from './timestamp-ms.transformer';

export type ScopeType = 'conversation' | 'contact' | 'user' | 'global';

@Entity({ name: 'agent_snapshots' })
@Index('IDX_agent_snapshots_unique', ['agentId', 'operation', 'userId', 'scopeType', 'scopeId', 'sourceHash', 'promptVersion'], { unique: true })
@Index('IDX_agent_snapshots_expires_at', ['expiresAt'])
export class AgentSnapshot {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  agentId: string;

  @Column({ type: 'text', nullable: true })
  operation: string | null;

  @Column({ type: 'text' })
  scopeType: ScopeType;

  @Column({ type: 'text', nullable: true })
  scopeId: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'text' })
  sourceHash: string;

  @Column({ type: 'text' })
  promptVersion: string;

  @Column({ type: 'text', nullable: true })
  model: string | null;

  @Column({ type: 'jsonb' })
  input: Record<string, any>;

  @Column({ type: 'jsonb' })
  output: Record<string, any>;

  @Column({ type: 'bigint', nullable: true, transformer: timestampMsTransformer })
  expiresAt: Date | null;

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  updatedAt: Date;

  @BeforeInsert()
  setCreatedAt() {
    if (!this.id) {
      this.id = uuidv7();
    }
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
